import { Task, ChatMessage } from "@/types";

export const mockTasks: Task[] = [
  {
    id: "task-1",
    incidentId: "inc-1",
    title: "Distribute water — Sector 2",
    description: "Ensure 500 bottles reach the temporary shelter.",
    status: "TODO",
    assigneeIds: ["user-1"],
    subtasks: [
      {
        id: "sub-1-1",
        taskId: "task-1",
        label: "Load truck at HQ",
        checked: true,
        checkedBy: "user-1",
        checkedAt: Date.now() - 3600000,
        createdBy: "user-2",
        createdAt: Date.now() - 7200000,
      },
      {
        id: "sub-1-2",
        taskId: "task-1",
        label: "Deliver to Sector 2",
        checked: false,
        checkedBy: null,
        checkedAt: null,
        createdBy: "user-2",
        createdAt: Date.now() - 7200000,
      }
    ],
    createdBy: "user-2",
    createdAt: Date.now() - 7200000,
    statusChangedAt: null,
    statusChangedBy: null,
  },
  {
    id: "task-2",
    incidentId: "inc-1",
    title: "Setup Medical Tents",
    status: "IN_PROGRESS",
    assigneeIds: ["user-2", "user-3"],
    subtasks: [
      {
        id: "sub-2-1",
        taskId: "task-2",
        label: "Clear debris from site",
        checked: true,
        checkedBy: "user-3",
        checkedAt: Date.now() - 1800000,
        createdBy: "user-1",
        createdAt: Date.now() - 86400000,
      },
      {
        id: "sub-2-2",
        taskId: "task-2",
        label: "Pitch 3 tents",
        checked: false,
        checkedBy: null,
        checkedAt: null,
        createdBy: "user-1",
        createdAt: Date.now() - 86400000,
      }
    ],
    createdBy: "user-1",
    createdAt: Date.now() - 86400000,
    statusChangedAt: Date.now() - 3600000,
    statusChangedBy: "user-2",
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    incidentId: "inc-1",
    authorId: "user-2",
    authorName: "Rohan Desai",
    body: "Medical supplies are running low at Sector 1.",
    clientTimestamp: Date.now() - 5000000,
    syncedAt: Date.now() - 4900000,
  },
  {
    id: "msg-2",
    incidentId: "inc-1",
    authorId: "user-1",
    authorName: "Aarav Sharma",
    body: "Copy that. We are rerouting truck B.",
    clientTimestamp: Date.now() - 4000000,
    syncedAt: Date.now() - 3900000,
  },
  {
    id: "msg-sys-1",
    incidentId: "inc-1",
    authorId: "SYSTEM",
    authorName: "System",
    body: "✅ 'Clear main road' marked done by Priya",
    clientTimestamp: Date.now() - 2000000,
    syncedAt: Date.now() - 1900000,
  }
];
