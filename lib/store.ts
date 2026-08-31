// lib/store.ts
import type { Incident, ResourceRequest, Task, Subtask, ChatMessage, ActivityLogEntry } from "@/types";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

// Single embedded query — fetches an incident with all related rows (team
// members, resource requests, activity log, tasks + subtasks, chat) in one
// round trip via PostgREST's foreign-table embedding, instead of 1 + 5*N
// separate queries. That N+1 pattern was slow enough (600ms-1.2s per list
// load, worse as data grows) to intermittently time out / connection-reset,
// which made the incident list silently fall back to a stale local cache.
const INCIDENT_SELECT = `
  *,
  incident_team_members(device_id),
  resource_requests(*),
  activity_logs(*),
  tasks(*, task_assignees(device_id), subtasks(*)),
  chat_messages(*)
`;

function mapIncidentRow(inc: any): Incident {
  return {
    id: inc.id,
    type: inc.type,
    location: inc.location,
    severity: inc.severity,
    affected_count: inc.affected_count,
    description: inc.description,
    status: inc.status,
    team_size_needed: inc.team_size_needed,
    team_leader: inc.team_leader,
    deleted: inc.deleted,
    created_at: inc.created_at,
    last_updated: inc.updated_at,
    team_members: (inc.incident_team_members || []).map((m: any) => m.device_id),
    resource_requests: (inc.resource_requests || []).map((r: any) => ({
      id: r.id,
      incident_id: r.incident_id,
      priority: r.priority,
      status: r.status,
      items: r.items,
      created_at: r.created_at
    })),
    activity_log: (inc.activity_logs || [])
      .map((l: any) => ({
        timestamp: l.timestamp,
        device_id: l.device_id,
        action: l.action
      }))
      .sort((a: ActivityLogEntry, b: ActivityLogEntry) => a.timestamp - b.timestamp),
    tasks: (inc.tasks || []).map((t: any) => ({
      id: t.id,
      incidentId: t.incident_id,
      title: t.title,
      description: t.description,
      status: t.status,
      members_required: t.members_required || 1,
      createdBy: t.created_by,
      statusChangedBy: t.status_changed_by,
      statusChangedAt: t.status_changed_at,
      createdAt: t.created_at,
      assigneeIds: (t.task_assignees || []).map((a: any) => a.device_id),
      subtasks: (t.subtasks || []).map((s: any) => ({
        id: s.id,
        taskId: s.task_id,
        label: s.label,
        checked: s.checked,
        checkedBy: s.checked_by,
        checkedAt: s.checked_at,
        createdBy: s.created_by,
        createdAt: s.created_at
      }))
    })),
    chatMessages: (inc.chat_messages || [])
      .map((m: any) => ({
        id: m.id,
        incidentId: m.incident_id,
        authorId: m.author_id,
        authorName: m.author_name,
        body: m.body,
        clientTimestamp: m.client_timestamp,
        syncedAt: m.synced_at
      }))
      .sort((a: ChatMessage, b: ChatMessage) => a.clientTimestamp - b.clientTimestamp),
    related_incident_ids: inc.related_incident_ids || []
  } as Incident;
}

export async function getIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.from('incidents').select(INCIDENT_SELECT);
  if (error || !data) {
    console.error("Error fetching incidents", error);
    return [];
  }
  return data.map(mapIncidentRow);
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const { data, error } = await supabase.from('incidents').select(INCIDENT_SELECT).eq('id', id).single();
  if (error || !data) return undefined;
  return mapIncidentRow(data);
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

async function saveIncidentToRelational(incident: Incident) {
  const { error: incError } = await supabase.from('incidents').upsert({
    id: incident.id,
    type: incident.type,
    location: incident.location,
    severity: incident.severity,
    affected_count: incident.affected_count,
    description: incident.description,
    status: incident.status,
    team_size_needed: incident.team_size_needed,
    team_leader: incident.team_leader,
    deleted: incident.deleted,
    related_incident_ids: incident.related_incident_ids,
    created_at: incident.created_at,
    updated_at: incident.last_updated
  });
  if (incError) console.error("Error upserting incident", incError);

  // team members
  await supabase.from('incident_team_members').delete().eq('incident_id', incident.id);
  if (incident.team_members.length > 0) {
    await supabase.from('incident_team_members').insert(incident.team_members.map(device_id => ({
      incident_id: incident.id,
      device_id,
      joined_at: Date.now()
    })));
  }

  // resource requests
  await supabase.from('resource_requests').delete().eq('incident_id', incident.id);
  if (incident.resource_requests && incident.resource_requests.length > 0) {
    await supabase.from('resource_requests').insert(incident.resource_requests.map(r => ({
      id: r.id,
      incident_id: incident.id,
      priority: r.priority,
      status: r.status,
      items: r.items,
      created_at: r.created_at
    })));
  }

  // activity logs
  await supabase.from('activity_logs').delete().eq('incident_id', incident.id);
  if (incident.activity_log && incident.activity_log.length > 0) {
    await supabase.from('activity_logs').insert(incident.activity_log.map((log, i) => ({
      id: `${incident.id}-log-${i}-${log.timestamp}`,
      incident_id: incident.id,
      device_id: log.device_id,
      action: log.action,
      timestamp: log.timestamp
    })));
  }

  // tasks
  await supabase.from('tasks').delete().eq('incident_id', incident.id);
  if (incident.tasks && incident.tasks.length > 0) {
    await supabase.from('tasks').upsert(incident.tasks.map(t => ({
      id: t.id,
      incident_id: incident.id,
      title: t.title,
      description: t.description,
      status: t.status,
      members_required: t.members_required || 1,
      created_by: t.createdBy,
      status_changed_by: t.statusChangedBy,
      status_changed_at: t.statusChangedAt,
      created_at: t.createdAt
    })));

    for (const t of incident.tasks) {
      await supabase.from('task_assignees').delete().eq('task_id', t.id);
      if (t.assigneeIds && t.assigneeIds.length > 0) {
        await supabase.from('task_assignees').insert(t.assigneeIds.map(device_id => ({
          task_id: t.id,
          device_id
        })));
      }

      await supabase.from('subtasks').delete().eq('task_id', t.id);
      if (t.subtasks && t.subtasks.length > 0) {
        await supabase.from('subtasks').insert(t.subtasks.map(s => ({
          id: s.id,
          task_id: t.id,
          label: s.label,
          checked: s.checked,
          checked_by: s.checkedBy,
          checked_at: s.checkedAt,
          created_by: s.createdBy,
          created_at: s.createdAt
        })));
      }
    }
  }

  // chat messages
  if (incident.chatMessages && incident.chatMessages.length > 0) {
    await supabase.from('chat_messages').upsert(incident.chatMessages.map(m => ({
      id: m.id,
      incident_id: incident.id,
      author_id: m.authorId,
      author_name: m.authorName,
      body: m.body,
      client_timestamp: m.clientTimestamp,
      synced_at: m.syncedAt
    })));
  }
}

export async function createIncident(incident: Incident): Promise<void> {
  await saveIncidentToRelational(incident);
}

// ---------------------------------------------------------------------------
// Lock mechanism to prevent race conditions during concurrent updates
// ---------------------------------------------------------------------------
class Mutex {
  private promise = Promise.resolve();
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    const wait = this.promise;
    this.promise = wait.then(() => next);
    try {
      await wait;
      return await fn();
    } finally {
      release();
    }
  }
}

const incidentLocks = new Map<string, Mutex>();

function getLock(id: string) {
  if (!incidentLocks.has(id)) incidentLocks.set(id, new Mutex());
  return incidentLocks.get(id)!;
}

export async function updateIncident(
  id: string,
  updater: (incident: Incident) => Incident
): Promise<Incident | null> {
  const lock = getLock(id);
  
  return lock.runExclusive(async () => {
    const incident = await getIncident(id);
    if (!incident) return null;

    const updatedIncident = updater(incident);
    await saveIncidentToRelational(updatedIncident);
    
    return updatedIncident;
  });
}

// ---------------------------------------------------------------------------
// Resource request helpers
// ---------------------------------------------------------------------------

export async function addResourceRequest(
  incidentId: string,
  req: ResourceRequest
): Promise<Incident | null> {
  return updateIncident(incidentId, (inc) => ({
    ...inc,
    resource_requests: [...inc.resource_requests, req],
    last_updated: Date.now(),
  }));
}

export async function updateResourceRequest(
  incidentId: string,
  resourceId: string,
  updater: (r: ResourceRequest) => ResourceRequest
): Promise<Incident | null> {
  return updateIncident(incidentId, (inc) => ({
    ...inc,
    resource_requests: inc.resource_requests.map((r) =>
      r.id === resourceId ? updater(r) : r
    ),
    last_updated: Date.now(),
  }));
}

// ---------------------------------------------------------------------------
// Status chain helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER = ["UNASSIGNED", "RECRUITING", "IN_PROGRESS", "RESOLVED"] as const;
type IncidentStatus = (typeof STATUS_ORDER)[number];

export function isStatusForward(
  current: IncidentStatus,
  next: IncidentStatus
): boolean {
  return STATUS_ORDER.indexOf(next) > STATUS_ORDER.indexOf(current);
}

const RESOURCE_STATUS_ORDER = ["PENDING", "ACCEPTED", "DELIVERED"] as const;
type ResourceStatus = (typeof RESOURCE_STATUS_ORDER)[number] | "CANCELLED";

export function isResourceStatusForward(
  current: ResourceStatus,
  next: ResourceStatus
): boolean {
  const ci = RESOURCE_STATUS_ORDER.indexOf(current as (typeof RESOURCE_STATUS_ORDER)[number]);
  const ni = RESOURCE_STATUS_ORDER.indexOf(next as (typeof RESOURCE_STATUS_ORDER)[number]);
  if (ci === -1 || ni === -1) return false;
  return ni > ci;
}
