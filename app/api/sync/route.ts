// app/api/sync/route.ts
// POST /api/sync — apply a batch of QueuedActions in seq_number order.
//
// Returns results shaped exactly as lib/sync.ts expects:
//   { device_id, seq_number, status: "applied" | "rejected" | "error", message }[]
//
// Conflict rules (from spec's Phase 5):
//   CREATE_INCIDENT: insert normally; if same type+location within 30min → populate related_incident_ids on both
//   CLAIM: if unclaimed → apply; if already claimed by another device with earlier timestamp → rejected (add to team_members instead)
//   STATUS_UPDATE / RESOURCE_STATUS_UPDATE: forward-only; reject backward moves
//   "error" reserved for genuine server exceptions (so client retries automatically)
//   "rejected" = resolved outcome, client clears it from the queue

import { NextRequest, NextResponse } from "next/server";
import type { QueuedAction, Incident, ActivityLogEntry, ResourceRequest, ChatMessage } from "@/types";
import {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  updateResourceRequest,
} from "@/lib/store";

interface SyncActionResult {
  device_id: string;
  seq_number: number;
  status: "applied" | "rejected" | "error";
  message: string;
}

// ---------------------------------------------------------------------------
// Status chains
// ---------------------------------------------------------------------------

const INCIDENT_STATUS_ORDER = ["UNASSIGNED", "RECRUITING", "IN_PROGRESS", "RESOLVED"] as const;
const RESOURCE_STATUS_ORDER = ["PENDING", "ACCEPTED", "DELIVERED"] as const;

function incidentStatusForward(current: string, next: string): boolean {
  const ci = INCIDENT_STATUS_ORDER.indexOf(current as (typeof INCIDENT_STATUS_ORDER)[number]);
  const ni = INCIDENT_STATUS_ORDER.indexOf(next as (typeof INCIDENT_STATUS_ORDER)[number]);
  return ni > ci && ci >= 0 && ni >= 0;
}

function resourceStatusForward(current: string, next: string): boolean {
  const ci = RESOURCE_STATUS_ORDER.indexOf(current as (typeof RESOURCE_STATUS_ORDER)[number]);
  const ni = RESOURCE_STATUS_ORDER.indexOf(next as (typeof RESOURCE_STATUS_ORDER)[number]);
  return ni > ci && ci >= 0 && ni >= 0;
}

// ---------------------------------------------------------------------------
// 30-minute duplicate detection window (ms)
// ---------------------------------------------------------------------------

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { actions: QueuedAction[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { actions } = body;
  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: "actions must be an array" }, { status: 400 });
  }

  // Sort by (device_id, seq_number) so actions from the same device apply in order.
  // Multiple devices can interleave, but within each device seq order must be preserved.
  const sorted = [...actions].sort((a, b) => {
    if (a.device_id === b.device_id) return a.seq_number - b.seq_number;
    return a.device_id.localeCompare(b.device_id);
  });

  const results: SyncActionResult[] = [];

  for (const action of sorted) {
    try {
      const result = await applyAction(action);
      results.push(result);
    } catch (err) {
      // Genuine server error — status "error" so client retries
      console.error("sync: action threw", action.device_id, action.seq_number, err);
      results.push({
        device_id: action.device_id,
        seq_number: action.seq_number,
        status: "error",
        message: `Server error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({ results });
}

// ---------------------------------------------------------------------------
// Per-action apply logic
// ---------------------------------------------------------------------------

async function applyAction(action: QueuedAction): Promise<SyncActionResult> {
  const { device_id, seq_number, action_type, incident_id, payload } = action;
  const now = action.timestamp; // Use the action's timestamp for ordering/comparison

  function log(action_str: string): ActivityLogEntry {
    return { timestamp: now, device_id, action: action_str };
  }

  // -------------------------------------------------------------------------
  // CREATE_INCIDENT
  // -------------------------------------------------------------------------
  if (action_type === "CREATE_INCIDENT") {
    const p = payload as Record<string, unknown>;
    const newIncident: Incident = {
      id: (p.id as string) ?? crypto.randomUUID(),
      type: (p.type as string) ?? "OTHER",
      location: (p.location as string) ?? "",
      severity: (p.severity as "LOW" | "MODERATE" | "CRITICAL") ?? "MODERATE",
      affected_count: Number(p.affected_count) || 0,
      description: (p.description as string) ?? "",
      status: "UNASSIGNED",
      deleted: false,
      team_size_needed: Number(p.team_size_needed) || 3,
      team_members: [],
      team_leader: null,
      resource_requests: [],
      activity_log: [
        log(`Reported by Worker ${device_id.slice(0, 8)} (synced)`),
      ],
      related_incident_ids: [],
      created_at: now,
      last_updated: now,
      tasks: [],
      chatMessages: [],
    };

    // Duplicate detection: same type + location within 30-min window
    const allIncidents = await getIncidents();
    const possibleDuplicates = allIncidents.filter(
      (existing) =>
        !existing.deleted &&
        existing.id !== newIncident.id &&
        existing.type === newIncident.type &&
        existing.location === newIncident.location &&
        Math.abs(existing.created_at - newIncident.created_at) <= DUPLICATE_WINDOW_MS
    );

    await createIncident(newIncident);

    if (possibleDuplicates.length > 0) {
      // Link both ways
      const duplicateIds = possibleDuplicates.map((d) => d.id);

      await updateIncident(newIncident.id, (inc) => ({
        ...inc,
        related_incident_ids: [...new Set([...inc.related_incident_ids, ...duplicateIds])],
        activity_log: [
          ...inc.activity_log,
          log(`Possible duplicate of: ${duplicateIds.map((d) => d.slice(0, 8)).join(", ")}`),
        ],
      }));

      for (const dup of possibleDuplicates) {
        await updateIncident(dup.id, (inc) => ({
          ...inc,
          related_incident_ids: [...new Set([...inc.related_incident_ids, newIncident.id])],
          activity_log: [
            ...inc.activity_log,
            log(`Possible duplicate flagged: ${newIncident.id.slice(0, 8)}`),
          ],
        }));
      }

      return {
        device_id,
        seq_number,
        status: "applied",
        message: `✓ Incident created — possible duplicate of ${possibleDuplicates.length} existing incident(s) at ${newIncident.location}`,
      };
    }

    return {
      device_id,
      seq_number,
      status: "applied",
      message: `✓ Incident created (${newIncident.type} at ${newIncident.location})`,
    };
  }

  // -------------------------------------------------------------------------
  // EDIT_INCIDENT
  // -------------------------------------------------------------------------
  if (action_type === "EDIT_INCIDENT") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted — edit discarded" };
    }
    const p = payload as Record<string, unknown>;
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      ...(p.type !== undefined && { type: p.type as string }),
      ...(p.location !== undefined && { location: p.location as string }),
      ...(p.severity !== undefined && { severity: p.severity as "LOW" | "MODERATE" | "CRITICAL" }),
      ...(p.affected_count !== undefined && { affected_count: Number(p.affected_count) }),
      ...(p.description !== undefined && { description: p.description as string }),
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Edited by Worker ${device_id.slice(0, 8)} (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Incident edits applied` };
  }

  // -------------------------------------------------------------------------
  // DELETE_INCIDENT
  // -------------------------------------------------------------------------
  if (action_type === "DELETE_INCIDENT") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found — delete discarded" };
    }
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      deleted: true,
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Deleted by Worker ${device_id.slice(0, 8)} (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Incident soft-deleted` };
  }

  // -------------------------------------------------------------------------
  // CLAIM
  // -------------------------------------------------------------------------
  if (action_type === "CLAIM") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }

    if (incident.status === "UNASSIGNED") {
      // No conflict — apply claim normally
      await updateIncident(incident_id, (inc) => ({
        ...inc,
        team_leader: device_id,
        team_members: [device_id],
        status: "RECRUITING" as const,
        last_updated: now,
        activity_log: [
          ...inc.activity_log,
          log(`Claimed by Worker ${device_id.slice(0, 8)} (synced) — team leader`),
        ],
      }));
      return { device_id, seq_number, status: "applied", message: `✓ Claimed incident — team leader set` };
    }

    // Already claimed by another device
    // Conflict rule: compare timestamps. Earlier claim wins leadership.
    // This device's timestamp vs. the time the first claimant was recorded.
    const existingLeaderLog = incident.activity_log.find((e) => e.action.includes("Claimed") || e.action.includes("team leader"));
    const leaderTimestamp = existingLeaderLog?.timestamp ?? incident.created_at;

    if (now < leaderTimestamp) {
      // This device actually claimed earlier — it should be leader; demote current leader to member
      const currentLeader = incident.team_leader;
      await updateIncident(incident_id, (inc) => ({
        ...inc,
        team_leader: device_id,
        team_members: [device_id, ...inc.team_members.filter((m) => m !== device_id)],
        last_updated: now,
        activity_log: [
          ...inc.activity_log,
          log(`Claim conflict resolved — Worker ${device_id.slice(0, 8)} has earlier timestamp, promoted to leader; Worker ${(currentLeader ?? "").slice(0, 8)} demoted to member`),
        ],
      }));
      return {
        device_id,
        seq_number,
        status: "rejected", // "rejected" = resolved outcome, not a failure
        message: `⚠ Claim conflict resolved — added as team leader (earlier timestamp)`,
      };
    } else {
      // Other device claimed earlier — this device becomes a team member
      if (!incident.team_members.includes(device_id)) {
        await updateIncident(incident_id, (inc) => ({
          ...inc,
          team_members: [...inc.team_members, device_id],
          last_updated: now,
          activity_log: [
            ...inc.activity_log,
            log(`Claim conflict resolved — Worker ${device_id.slice(0, 8)} added as team member (later timestamp)`),
          ],
        }));
      }
      return {
        device_id,
        seq_number,
        status: "rejected", // resolved outcome
        message: `⚠ Claim conflict resolved — added as team member (another device claimed first)`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // JOIN_TEAM
  // -------------------------------------------------------------------------
  if (action_type === "JOIN_TEAM") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }
    if (!["RECRUITING", "IN_PROGRESS"].includes(incident.status)) {
      return { device_id, seq_number, status: "rejected", message: `⚠ Cannot join — incident is ${incident.status}` };
    }
    if (incident.team_members.includes(device_id)) {
      return { device_id, seq_number, status: "applied", message: `✓ Already a team member — no change` };
    }
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      team_members: [...inc.team_members, device_id],
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Worker ${device_id.slice(0, 8)} joined team (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Joined team` };
  }

  // -------------------------------------------------------------------------
  // LEAVE_TEAM
  // -------------------------------------------------------------------------
  if (action_type === "LEAVE_TEAM") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }
    if (!incident.team_members.includes(device_id)) {
      return { device_id, seq_number, status: "applied", message: `✓ Not a team member — no change` };
    }

    await updateIncident(incident_id, (inc) => {
      const newMembers = inc.team_members.filter((m) => m !== device_id);
      const isLeader = inc.team_leader === device_id;
      let newLeader = inc.team_leader;
      let newStatus = inc.status;
      const logLines: ActivityLogEntry[] = [log(`Worker ${device_id.slice(0, 8)} left team (synced)`)];

      if (newMembers.length === 0) {
        newLeader = null;
        newStatus = "UNASSIGNED";
        logLines.push(log("Team empty — incident reverted to UNASSIGNED"));
      } else if (isLeader) {
        newLeader = newMembers[0];
        logLines.push(log(`Leadership transferred to Worker ${newMembers[0].slice(0, 8)}`));
      }

      return {
        ...inc,
        team_members: newMembers,
        team_leader: newLeader,
        status: newStatus as Incident["status"],
        last_updated: now,
        activity_log: [...inc.activity_log, ...logLines],
      };
    });
    return { device_id, seq_number, status: "applied", message: `✓ Left team` };
  }

  // -------------------------------------------------------------------------
  // STATUS_UPDATE
  // -------------------------------------------------------------------------
  if (action_type === "STATUS_UPDATE") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }

    const p = payload as Record<string, unknown>;
    const new_status = p.new_status as string;

    if (!incidentStatusForward(incident.status, new_status)) {
      return {
        device_id,
        seq_number,
        status: "rejected",
        message: `⚠ Status conflict — kept further-along state (${incident.status} → ${new_status} rejected)`,
      };
    }

    const isResolving = new_status === "RESOLVED";
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      status: new_status as Incident["status"],
      resource_requests: isResolving
        ? inc.resource_requests.map((r) => (r.status === "PENDING" ? { ...r, status: "CANCELLED" as const } : r))
        : inc.resource_requests,
      last_updated: now,
      activity_log: [
        ...inc.activity_log,
        log(`Status changed to ${new_status} (synced)`),
        ...(isResolving ? [log("Pending resource requests auto-cancelled on resolve")] : []),
      ],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Status updated to ${new_status}` };
  }

  // -------------------------------------------------------------------------
  // RESOURCE_REQUEST
  // -------------------------------------------------------------------------
  if (action_type === "RESOURCE_REQUEST") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }

    const p = payload as Record<string, unknown>;
    const newReq: ResourceRequest = {
      id: (p.id as string) ?? crypto.randomUUID(),
      incident_id: incident_id,
      items: (p.items as ResourceRequest["items"]) ?? {},
      priority: (p.priority as "LOW" | "MODERATE" | "CRITICAL") ?? "MODERATE",
      status: "PENDING",
      created_at: now,
    };
    // Use a single updateIncident call to add the resource request AND log the activity atomically.
    // This avoids a race condition where addResourceRequest + updateIncident (two Supabase round-trips)
    // could cause the log entry to overwrite the newly added resource request.
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      resource_requests: [...inc.resource_requests, newReq],
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Resource request created (${newReq.priority}) (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Resource request created` };
  }

  // -------------------------------------------------------------------------
  // RESOURCE_STATUS_UPDATE
  // -------------------------------------------------------------------------
  if (action_type === "RESOURCE_STATUS_UPDATE") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };
    }

    const p = payload as Record<string, unknown>;
    const resource_id = p.resource_id as string;
    const new_status = p.new_status as string;
    const resource = incident.resource_requests.find((r) => r.id === resource_id);

    if (!resource) {
      return { device_id, seq_number, status: "rejected", message: "⚠ Resource request not found" };
    }
    if (!resourceStatusForward(resource.status, new_status)) {
      return {
        device_id,
        seq_number,
        status: "rejected",
        message: `⚠ Status conflict — kept further-along state (${resource.status} → ${new_status} rejected)`,
      };
    }

    await updateResourceRequest(incident_id, resource_id, (r) => ({
      ...r,
      status: new_status as ResourceRequest["status"],
    }));
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Resource ${resource_id.slice(0, 8)} status → ${new_status} (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Resource status updated to ${new_status}` };
  }

  // -------------------------------------------------------------------------
  // CREATE_TASK
  // -------------------------------------------------------------------------
  if (action_type === "CREATE_TASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found or deleted" };

    const p = payload as Record<string, unknown>;
    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: [
        ...(inc.tasks || []),
        {
          id: p.taskId as string || crypto.randomUUID(),
          incidentId: incident_id,
          title: p.title as string,
          description: p.description as string,
          status: "TODO",
          assigneeIds: [],
          members_required: Number(p.members_required) || 1,
          subtasks: [],
          createdBy: device_id,
          createdAt: now,
          statusChangedAt: now,
          statusChangedBy: device_id
        }
      ],
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Task created (synced)`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Task created` };
  }

  // -------------------------------------------------------------------------
  // EDIT_TASK
  // -------------------------------------------------------------------------
  if (action_type === "EDIT_TASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;
    const title = p.title as string;
    const members_required = Number(p.members_required);

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        title: title || t.title,
        members_required: members_required || t.members_required
      } : t),
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Task updated`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Task updated` };
  }

  // -------------------------------------------------------------------------
  // DELETE_TASK
  // -------------------------------------------------------------------------
  if (action_type === "DELETE_TASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).filter(t => t.id !== taskId),
      last_updated: now,
      activity_log: [...inc.activity_log, log(`Task deleted`)],
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Task deleted` };
  }

  // -------------------------------------------------------------------------
  // ASSIGN_TASK
  // -------------------------------------------------------------------------
  if (action_type === "ASSIGN_TASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;
    const addAssigneeIds = p.addAssigneeIds as string[];

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        assigneeIds: Array.from(new Set([...t.assigneeIds, ...addAssigneeIds]))
      } : t),
      last_updated: now
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Task assignees added` };
  }

  // -------------------------------------------------------------------------
  // UNASSIGN_TASK
  // -------------------------------------------------------------------------
  if (action_type === "UNASSIGN_TASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;
    const removeAssigneeIds = p.removeAssigneeIds as string[];

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        assigneeIds: t.assigneeIds.filter(a => !removeAssigneeIds.includes(a))
      } : t),
      last_updated: now
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Task assignees removed` };
  }

  // -------------------------------------------------------------------------
  // SET_TASK_STATUS
  // -------------------------------------------------------------------------
  if (action_type === "SET_TASK_STATUS") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;
    const status = p.status as "TODO" | "IN_PROGRESS" | "DONE";
    const clientTimestamp = p.clientTimestamp as number;

    const task = (incident.tasks || []).find(t => t.id === taskId);
    if (!task) return { device_id, seq_number, status: "rejected", message: "⚠ Task not found" };

    if (task.statusChangedAt && clientTimestamp < task.statusChangedAt) {
      return { device_id, seq_number, status: "rejected", message: `⚠ Task status conflict — keeping newer status (${task.status})` };
    }

    await updateIncident(incident_id, (inc) => {
      let taskName = "";
      let newLog: ActivityLogEntry[] = [];
      let newChat: ChatMessage[] = [];

      const tasks = (inc.tasks || []).map(t => {
        if (t.id === taskId) {
          taskName = t.title;
          return {
            ...t,
            status,
            statusChangedAt: clientTimestamp,
            statusChangedBy: device_id
          };
        }
        return t;
      });

      if (status === "DONE" && taskName) {
        newLog = [log(`Task "${taskName}" marked done by Worker ${String(device_id).slice(0, 8)}`)];
        newChat = [{
          id: crypto.randomUUID(),
          incidentId: incident_id,
          authorId: "SYSTEM",
          authorName: "System",
          body: `✅ "${taskName}" marked done by Worker ${String(device_id).slice(0, 8)}`,
          clientTimestamp,
          syncedAt: now
        }];
      }

      return {
        ...inc,
        tasks,
        activity_log: [...inc.activity_log, ...newLog],
        chatMessages: [...(inc.chatMessages || []), ...newChat],
        last_updated: now
      };
    });
    return { device_id, seq_number, status: "applied", message: `✓ Task status updated to ${status}` };
  }

  // -------------------------------------------------------------------------
  // ADD_SUBTASK
  // -------------------------------------------------------------------------
  if (action_type === "ADD_SUBTASK") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const taskId = p.taskId as string;
    const label = p.label as string;
    const subtaskId = p.subtaskId as string || crypto.randomUUID();

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        subtasks: [...t.subtasks, {
          id: subtaskId,
          taskId,
          label,
          checked: false,
          checkedBy: null,
          checkedAt: null,
          createdBy: device_id,
          createdAt: now
        }]
      } : t),
      last_updated: now
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Subtask added` };
  }

  // -------------------------------------------------------------------------
  // SET_SUBTASK_CHECKED
  // -------------------------------------------------------------------------
  if (action_type === "SET_SUBTASK_CHECKED") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const subtaskId = p.subtaskId as string;
    const checked = p.checked as boolean;
    const clientTimestamp = p.clientTimestamp as number;

    // Find current checkedAt
    let currentCheckedAt: number | null = null;
    (incident.tasks || []).forEach(t => {
      t.subtasks.forEach(s => {
        if (s.id === subtaskId) {
          currentCheckedAt = s.checkedAt;
        }
      });
    });

    if (currentCheckedAt !== null && currentCheckedAt > clientTimestamp) {
      return { device_id, seq_number, status: "rejected", message: `⚠ Subtask conflict — keeping newer check state` };
    }

    await updateIncident(incident_id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => ({
        ...t,
        subtasks: t.subtasks.map(s => s.id === subtaskId ? {
          ...s,
          checked,
          checkedBy: checked ? device_id : null,
          checkedAt: checked ? clientTimestamp : null  // BUG FIX: was always setting clientTimestamp even when unchecking
        } : s)
      })),
      last_updated: now
    }));
    return { device_id, seq_number, status: "applied", message: `✓ Subtask checked=${checked}` };
  }

  // -------------------------------------------------------------------------
  // POST_CHAT_MESSAGE
  // -------------------------------------------------------------------------
  if (action_type === "POST_CHAT_MESSAGE") {
    if (!incident_id) return { device_id, seq_number, status: "error", message: "Missing incident_id" };
    const incident = await getIncident(incident_id);
    if (!incident || incident.deleted) return { device_id, seq_number, status: "rejected", message: "⚠ Incident not found" };

    const p = payload as Record<string, unknown>;
    const newMessage: ChatMessage = {
      id: (p.messageId as string) || crypto.randomUUID(),
      incidentId: incident_id,
      authorId: device_id,
      authorName: (p.authorName as string) || `Worker ${device_id.slice(0, 8)}`,
      body: p.body as string,
      clientTimestamp: p.clientTimestamp as number,
      syncedAt: now
    };

    await updateIncident(incident_id, (inc) => {
      const allMessages = [...(inc.chatMessages || []), newMessage]
        .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
      return {
        ...inc,
        chatMessages: allMessages,
        last_updated: now
      };
    });
    return { device_id, seq_number, status: "applied", message: `✓ Chat message posted` };
  }

  // Unknown action type — treat as error so it gets retried
  return {
    device_id,
    seq_number,
    status: "error",
    message: `Unknown action_type: ${action_type}`,
  };
}
