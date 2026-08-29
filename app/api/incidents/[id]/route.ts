// app/api/incidents/[id]/route.ts
// PATCH /api/incidents/:id — edit core fields OR perform team/status actions
// DELETE /api/incidents/:id — soft-delete (sets deleted: true)
//
// PATCH action dispatch via body.action_type:
//   undefined / "EDIT_INCIDENT"   — edit core fields (type/location/severity/affected_count/description)
//   "CLAIM"                       — Phase 2: claim from UNASSIGNED
//   "JOIN_TEAM"                   — Phase 2: join during RECRUITING
//   "LEAVE_TEAM"                  — Phase 2: leave during RECRUITING or IN_PROGRESS
//   "STATUS_UPDATE"               — Phase 2: move status forward

import { NextRequest, NextResponse } from "next/server";
import type { ActivityLogEntry, ChatMessage } from "@/types";
import { getIncident, updateIncident } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/incidents/:id — fetch single incident
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json(incident, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/incidents/:id
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { action_type, device_id } = body;

  const incident = await getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  if (incident.deleted) {
    return NextResponse.json({ error: "Incident has been deleted" }, { status: 410 });
  }

  const now = Date.now();

  function logEntry(action: string): ActivityLogEntry {
    return { timestamp: now, device_id: device_id ?? "unknown", action };
  }

  // -------------------------------------------------------------------------
  // Route by action_type
  // -------------------------------------------------------------------------

  if (!action_type || action_type === "EDIT_INCIDENT") {
    // Edit core fields only (type/location/severity/affected_count/description).
    // Status, team, and resources are managed by separate action types.
    const { type, location, severity, affected_count, description } = body;

    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      ...(type !== undefined && { type }),
      ...(location !== undefined && { location }),
      ...(severity !== undefined && { severity }),
      ...(affected_count !== undefined && { affected_count: Number(affected_count) }),
      ...(description !== undefined && { description }),
      last_updated: now,
      activity_log: [
        ...inc.activity_log,
        logEntry(`Edited by Worker ${String(device_id).slice(0, 8)}`),
      ],
    }));

    return NextResponse.json(updated);
  }

  if (action_type === "CLAIM") {
    if (!device_id) {
      return NextResponse.json({ error: "device_id required" }, { status: 400 });
    }
    if (incident.status !== "UNASSIGNED") {
      return NextResponse.json(
        { error: "Can only claim an UNASSIGNED incident" },
        { status: 409 }
      );
    }

    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      team_leader: device_id,
      team_members: [device_id],
      status: "RECRUITING" as const,
      last_updated: now,
      activity_log: [
        ...inc.activity_log,
        logEntry(`Claimed incident — team leader set to Worker ${String(device_id).slice(0, 8)}`),
      ],
    }));

    return NextResponse.json(updated);
  }

  if (action_type === "JOIN_TEAM") {
    if (!device_id) {
      return NextResponse.json({ error: "device_id required" }, { status: 400 });
    }
    if (!["RECRUITING", "IN_PROGRESS"].includes(incident.status)) {
      return NextResponse.json(
        { error: "Can only join a RECRUITING or IN_PROGRESS incident" },
        { status: 409 }
      );
    }
    if (incident.team_members.includes(device_id)) {
      return NextResponse.json(
        { error: "Already a team member" },
        { status: 409 }
      );
    }

    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      team_members: [...inc.team_members, device_id],
      last_updated: now,
      activity_log: [
        ...inc.activity_log,
        logEntry(`Joined team — Worker ${String(device_id).slice(0, 8)}`),
      ],
    }));

    return NextResponse.json(updated);
  }

  if (action_type === "LEAVE_TEAM") {
    if (!device_id) {
      return NextResponse.json({ error: "device_id required" }, { status: 400 });
    }
    if (!["RECRUITING", "IN_PROGRESS"].includes(incident.status)) {
      return NextResponse.json(
        { error: "Can only leave during RECRUITING or IN_PROGRESS" },
        { status: 409 }
      );
    }
    if (!incident.team_members.includes(device_id)) {
      return NextResponse.json(
        { error: "Not a team member" },
        { status: 409 }
      );
    }

    const updated = await updateIncident(id, (inc) => {
      const newMembers = inc.team_members.filter((m) => m !== device_id);
      const isLeader = inc.team_leader === device_id;

      let newLeader = inc.team_leader;
      let newStatus = inc.status;
      const logLines: ActivityLogEntry[] = [
        logEntry(`Left team — Worker ${String(device_id).slice(0, 8)}`),
      ];

      if (newMembers.length === 0) {
        // Team is now empty — revert to UNASSIGNED
        newLeader = null;
        newStatus = "UNASSIGNED";
        logLines.push(logEntry("Team empty — incident reverted to UNASSIGNED"));
      } else if (isLeader) {
        // Auto-promote next member (by join order)
        newLeader = newMembers[0];
        logLines.push(
          logEntry(`Leadership transferred to Worker ${String(newMembers[0]).slice(0, 8)}`)
        );
      }

      return {
        ...inc,
        team_members: newMembers,
        team_leader: newLeader,
        status: newStatus as typeof inc.status,
        last_updated: now,
        activity_log: [...inc.activity_log, ...logLines],
      };
    });

    return NextResponse.json(updated);
  }

  if (action_type === "STATUS_UPDATE") {
    const { new_status } = body;
    if (!new_status) {
      return NextResponse.json({ error: "new_status required" }, { status: 400 });
    }

    // Status chain: UNASSIGNED → RECRUITING → IN_PROGRESS → RESOLVED
    const STATUS_ORDER = ["UNASSIGNED", "RECRUITING", "IN_PROGRESS", "RESOLVED"];
    const currentIdx = STATUS_ORDER.indexOf(incident.status);
    const nextIdx = STATUS_ORDER.indexOf(new_status);

    if (nextIdx <= currentIdx) {
      return NextResponse.json(
        { error: `Cannot move status backward from ${incident.status} to ${new_status}` },
        { status: 409 }
      );
    }

    const updated = await updateIncident(id, (inc) => {
      const isResolving = new_status === "RESOLVED";

      // Auto-cancel PENDING resource requests on RESOLVED (ACCEPTED ones stay)
      const updatedResourceRequests = isResolving
        ? inc.resource_requests.map((r) =>
            r.status === "PENDING" ? { ...r, status: "CANCELLED" as const } : r
          )
        : inc.resource_requests;

      return {
        ...inc,
        status: new_status as typeof inc.status,
        resource_requests: updatedResourceRequests,
        last_updated: now,
        activity_log: [
          ...inc.activity_log,
          logEntry(`Status changed to ${new_status} by Worker ${String(device_id).slice(0, 8)}`),
          ...(isResolving
            ? [logEntry("Pending resource requests auto-cancelled on resolve")]
            : []),
        ],
      };
    });

    return NextResponse.json(updated);
  }

  if (action_type === "DISMISS_DUPLICATE") {
    // Clear related_incident_ids when human confirms incidents are distinct events.
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      related_incident_ids: [],
      last_updated: now,
      activity_log: [
        ...inc.activity_log,
        logEntry(`Duplicate flag dismissed by Worker ${String(device_id).slice(0, 8)}`),
      ],
    }));
    return NextResponse.json(updated);
  }

  if (action_type === "CREATE_TASK") {
    const { title, description, taskId } = body;
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      tasks: [
        ...(inc.tasks || []),
        {
          id: taskId || crypto.randomUUID(),
          incidentId: inc.id,
          title,
          description,
          status: "TODO",
          assigneeIds: [],
          subtasks: [],
          createdBy: device_id,
          createdAt: now,
          statusChangedAt: now,
          statusChangedBy: device_id
        }
      ],
      last_updated: now,
    }));
    return NextResponse.json(updated);
  }

  if (action_type === "ASSIGN_TASK") {
    const { taskId, addAssigneeIds } = body;
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        assigneeIds: Array.from(new Set([...t.assigneeIds, ...addAssigneeIds]))
      } : t),
      last_updated: now
    }));
    return NextResponse.json(updated);
  }

  if (action_type === "UNASSIGN_TASK") {
    const { taskId, removeAssigneeIds } = body;
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        assigneeIds: t.assigneeIds.filter(a => !removeAssigneeIds.includes(a))
      } : t),
      last_updated: now
    }));
    return NextResponse.json(updated);
  }

  if (action_type === "SET_TASK_STATUS") {
    const { taskId, status, clientTimestamp } = body;
    const updated = await updateIncident(id, (inc) => {
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
        newLog = [logEntry(`Task "${taskName}" marked done by Worker ${String(device_id).slice(0, 8)}`)];
        newChat = [{
          id: crypto.randomUUID(),
          incidentId: inc.id,
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
    return NextResponse.json(updated);
  }

  if (action_type === "ADD_SUBTASK") {
    const { taskId, label } = body;
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => t.id === taskId ? {
        ...t,
        subtasks: [...t.subtasks, {
          id: crypto.randomUUID(),
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
    return NextResponse.json(updated);
  }

  if (action_type === "SET_SUBTASK_CHECKED") {
    const { subtaskId, checked, clientTimestamp } = body;
    const updated = await updateIncident(id, (inc) => ({
      ...inc,
      tasks: (inc.tasks || []).map(t => ({
        ...t,
        subtasks: t.subtasks.map(s => s.id === subtaskId ? {
          ...s,
          checked,
          checkedBy: checked ? device_id : null,
          checkedAt: checked ? clientTimestamp : null
        } : s)
      })),
      last_updated: now
    }));
    return NextResponse.json(updated);
  }

  if (action_type === "POST_CHAT_MESSAGE") {
    const { body: chatBody, clientTimestamp, authorName, messageId } = body;
    const updated = await updateIncident(id, (inc) => {
      const newMessage = {
        id: messageId || crypto.randomUUID(),
        incidentId: inc.id,
        authorId: device_id,
        authorName: authorName || `Worker ${String(device_id).slice(0, 8)}`,
        body: chatBody,
        clientTimestamp,
        syncedAt: now
      };

      const allMessages = [...(inc.chatMessages || []), newMessage]
        .sort((a, b) => a.clientTimestamp - b.clientTimestamp);

      return {
        ...inc,
        chatMessages: allMessages,
        last_updated: now
      };
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { error: `Unknown action_type: ${action_type}` },
    { status: 400 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/incidents/:id — soft-delete
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { device_id } = body;

  const incident = await getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const now = Date.now();

  const updated = await updateIncident(id, (inc) => ({
    ...inc,
    deleted: true,
    last_updated: now,
    activity_log: [
      ...inc.activity_log,
      {
        timestamp: now,
        device_id: device_id ?? "unknown",
        action: `Deleted by Worker ${String(device_id ?? "unknown").slice(0, 8)}`,
      },
    ],
  }));

  return NextResponse.json(updated);
}
