export interface ActivityLogEntry {
  timestamp: number;
  device_id: string;
  action: string;
}

export interface ResourceRequest {
  id: string;
  incident_id: string;
  items: { food?: number; water?: number; medicine?: number; medical_team?: boolean; shelter?: boolean; transport?: boolean };
  priority: "LOW" | "MODERATE" | "CRITICAL";
  status: "PENDING" | "ACCEPTED" | "DELIVERED" | "CANCELLED";
  created_at: number;
}

export interface Subtask {
  id: string;
  taskId: string;
  label: string;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: number | null;
  createdBy: string;
  createdAt: number;
}

export interface Task {
  id: string;
  incidentId: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeIds: string[];
  members_required: number;
  subtasks: Subtask[];
  createdBy: string;
  createdAt: number;
  statusChangedAt: number | null;
  statusChangedBy: string | null;
}

export interface ChatMessage {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  body: string;
  clientTimestamp: number;
  syncedAt: number | null;
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  severity: "LOW" | "MODERATE" | "CRITICAL";
  affected_count: number;
  description: string;
  status: "UNASSIGNED" | "RECRUITING" | "IN_PROGRESS" | "RESOLVED";
  deleted: boolean;
  team_size_needed: number;
  team_members: string[];
  team_leader: string | null;
  resource_requests: ResourceRequest[];
  activity_log: ActivityLogEntry[];
  related_incident_ids: string[];
  created_at: number;
  last_updated: number;
  tasks: Task[];
  chatMessages: ChatMessage[];
}

export type ActionType =
  | "CREATE_INCIDENT"
  | "EDIT_INCIDENT"
  | "DELETE_INCIDENT"
  | "CLAIM"
  | "JOIN_TEAM"
  | "LEAVE_TEAM"
  | "STATUS_UPDATE"
  | "RESOURCE_REQUEST"
  | "RESOURCE_STATUS_UPDATE"
  | "CREATE_TASK"
  | "EDIT_TASK"
  | "DELETE_TASK"
  | "ASSIGN_TASK"
  | "UNASSIGN_TASK"
  | "SET_TASK_STATUS"
  | "ADD_SUBTASK"
  | "SET_SUBTASK_CHECKED"
  | "POST_CHAT_MESSAGE";

export interface QueuedAction {
  device_id: string;
  seq_number: number;
  timestamp: number;
  action_type: ActionType;
  incident_id: string | null;
  payload: object;
  synced: boolean;
}
