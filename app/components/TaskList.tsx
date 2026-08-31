import type { Task, Subtask } from "@/types";
import { useState } from "react";
import { getDeviceId, generateUUID } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";

function TaskCard({ task, incidentId, isTeamMember }: { task: Task, incidentId: string, isTeamMember: boolean }) {
  const { isOffline } = useConnectivity();
  const deviceId = getDeviceId();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editReq, setEditReq] = useState(task.members_required || 1);
  const [newSubtask, setNewSubtask] = useState("");

  const checkedCount = task.subtasks.filter(s => s.checked).length;
  const totalCount = task.subtasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const statusColors = {
    TODO: "bg-[var(--bg-soft)] text-gray-400 border border-gray-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border border-blue-200",
    DONE: "bg-green-100 text-green-700 border border-green-200"
  };

  async function handleSubtaskCheck(subtaskId: string, checked: boolean) {
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "SET_SUBTASK_CHECKED",
      incident_id: incidentId,
      payload: { subtaskId, checked, clientTimestamp: Date.now(), device_id: deviceId }
    });
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "ADD_SUBTASK",
      incident_id: incidentId,
      payload: { taskId: task.id, label: newSubtask.trim(), device_id: deviceId }
    });
    setNewSubtask("");
  }

  async function handleToggleAssign() {
    const isAssignee = task.assigneeIds.includes(deviceId);
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: isAssignee ? "UNASSIGN_TASK" : "ASSIGN_TASK",
      incident_id: incidentId,
      payload: isAssignee ? { taskId: task.id, removeAssigneeIds: [deviceId], device_id: deviceId } : { taskId: task.id, addAssigneeIds: [deviceId], device_id: deviceId }
    });
  }

  async function handleDelete() {
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "DELETE_TASK",
      incident_id: incidentId,
      payload: { taskId: task.id, device_id: deviceId }
    });
  }

  async function handleSaveEdit() {
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "EDIT_TASK",
      incident_id: incidentId,
      payload: { taskId: task.id, title: editTitle, members_required: editReq, device_id: deviceId }
    });
    setEditing(false);
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as "TODO" | "IN_PROGRESS" | "DONE";
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "SET_TASK_STATUS",
      incident_id: incidentId,
      payload: { taskId: task.id, status: newStatus, clientTimestamp: Date.now(), device_id: deviceId }
    });
  }

  async function handleRemoveAssignee(targetId: string) {
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "UNASSIGN_TASK",
      incident_id: incidentId,
      payload: { taskId: task.id, removeAssigneeIds: [targetId], device_id: deviceId }
    });
  }

  const isAssignee = task.assigneeIds.includes(deviceId);
  const isFull = task.assigneeIds.length >= (task.members_required || 1);
  const canClaim = isAssignee || !isFull;

  if (editing) {
    return (
      <div className="border border-gray-700 bg-gray-800/50 rounded-2xl p-3 space-y-3 shadow-inner">
        <input 
          type="text" 
          value={editTitle} 
          onChange={e => setEditTitle(e.target.value)} 
          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" 
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Members Req:</label>
          <input 
            type="number" min="1" value={editReq} onChange={e => setEditReq(Number(e.target.value) || 1)} 
            className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" 
          />
        </div>
        
        {/* Add Subtask in Edit Mode */}
        <div className="pt-2 border-t border-gray-700">
          <label className="text-xs text-gray-400 mb-1.5 block">Add Subtask Checklist Item:</label>
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input 
              type="text" 
              value={newSubtask} 
              onChange={e => setNewSubtask(e.target.value)} 
              placeholder="e.g. Bring ladder" 
              className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" 
            />
            <button type="submit" disabled={!newSubtask.trim()} className="px-2.5 py-1 rounded text-[10px] uppercase font-semibold bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 disabled:opacity-50">Add</button>
          </form>
        </div>

        <div className="flex gap-2 justify-end pt-3">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] text-[var(--bg)] hover:opacity-85 transition-opacity">Save Task</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-800 bg-[var(--bg)] rounded-2xl p-3 space-y-3 transition-colors ${task.status === "DONE" ? "opacity-60 hover:opacity-100" : "hover:border-gray-700"}`}>
      <div className="flex justify-between items-start gap-2">
        <h4 className={`font-medium text-[var(--ink)] text-sm leading-tight break-words flex-1 min-w-0 ${task.status === "DONE" ? "line-through text-gray-500" : ""}`}>{task.title}</h4>
        
        {/* Status Dropdown */}
        <div className="relative shrink-0">
          <select 
            value={task.status} 
            onChange={handleStatusChange}
            className={`console-label text-[10px] px-2.5 py-0.5 rounded-full font-semibold cursor-pointer focus:outline-none appearance-none pr-5 ${statusColors[task.status]}`}
          >
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
            <svg className="h-3 w-3 fill-current opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
          </div>
        </div>
      </div>

      {task.description && (
        <p className={`text-xs break-words whitespace-pre-wrap ${task.status === "DONE" ? "text-gray-400" : "text-gray-500"}`}>{task.description}</p>
      )}

      {/* Transparency: Completed By */}
      {task.status === "DONE" && task.statusChangedBy && (
        <p className="text-[10px] text-green-600/90 italic font-mono">
          Completed by WORKER-{task.statusChangedBy.slice(0, 4).toUpperCase()}
        </p>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && task.status !== "DONE" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Progress</span>
            <span>{checkedCount}/{totalCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-[var(--bg-soft)] border border-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[var(--ink)] h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignees */}
      <div className="text-[10px] text-gray-500 flex gap-1 flex-wrap items-center">
        <span className="console-label text-gray-500">Assigned ({task.assigneeIds.length}/{task.members_required || 1}):</span>
        {task.assigneeIds.length > 0 ? (
          task.assigneeIds.map(id => (
            <span key={id} className="font-mono bg-[var(--bg-soft)] border border-gray-700 px-1.5 py-0.5 rounded text-[var(--ink)] flex items-center gap-1">
              WORKER-{id.slice(0, 4).toUpperCase()}
              {(isTeamMember || id === deviceId) && task.status !== "DONE" && (
                <button onClick={() => handleRemoveAssignee(id)} className="text-gray-400 hover:text-red-500 font-bold ml-0.5">×</button>
              )}
            </span>
          ))
        ) : (
          <span className="italic">None</span>
        )}
        {isFull && !isAssignee && task.status !== "DONE" && <span className="text-amber-600 font-semibold ml-1">(Fully Staffed)</span>}
      </div>

      {/* Subtasks */}
      {totalCount > 0 && (
        <div className="pt-2 border-t border-gray-800 space-y-1.5">
          {task.subtasks.map(sub => (
            <label key={sub.id} className="flex items-start gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={sub.checked} 
                onChange={(e) => handleSubtaskCheck(sub.id, e.target.checked)}
                className="mt-0.5 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className={`text-xs break-words min-w-0 flex-1 ${sub.checked ? 'text-gray-500 line-through' : 'text-gray-300 group-hover:text-gray-100'}`}>
                {sub.label}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      {task.status !== "DONE" && (
        <div className="pt-2 border-t border-gray-800 flex gap-2 flex-wrap">
          <button 
            onClick={handleToggleAssign} 
            disabled={!canClaim}
            className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isAssignee ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
          >
            {isAssignee ? "Leave Task" : "Claim Task"}
          </button>
          <button 
            onClick={() => setEditing(true)} 
            className="text-[10px] px-2 py-1 rounded-full font-semibold bg-[var(--bg)] border border-gray-700 text-[var(--ink)] hover:bg-[var(--bg-soft)] transition-colors"
          >
            Edit
          </button>
          <button 
            onClick={handleDelete} 
            className="text-[10px] px-2 py-1 rounded-full font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
      
      {/* Optional minimal delete for done tasks */}
      {task.status === "DONE" && (
        <div className="flex justify-end pt-1">
          <button onClick={handleDelete} className="text-[10px] text-red-900 hover:text-red-500 transition-colors">Delete Task</button>
        </div>
      )}
    </div>
  );
}

export function TaskList({ tasks, incidentId, isTeamMember }: { tasks: Task[], incidentId: string, isTeamMember: boolean }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [membersRequired, setMembersRequired] = useState<number>(1);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const { isOffline } = useConnectivity();

  const STATUS_ORDER = { "IN_PROGRESS": 1, "TODO": 2, "DONE": 3 };
  const allTasks = [...tasks, ...optimisticTasks].reduce((acc, task) => {
    if (!acc.some(t => t.id === task.id)) {
      acc.push(task);
    }
    return acc;
  }, [] as Task[]).sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return b.createdAt - a.createdAt;
  });

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    const reqMembers = membersRequired;
    setNewTaskTitle(""); // Optimistic clear
    setMembersRequired(1);

    const device_id = getDeviceId();
    const newTask: Task = {
      id: generateUUID(),
      incidentId: incidentId,
      title,
      description: "",
      status: "TODO",
      assigneeIds: [],
      members_required: reqMembers,
      subtasks: [],
      createdBy: device_id,
      createdAt: Date.now(),
      statusChangedAt: Date.now(),
      statusChangedBy: device_id
    };

    setOptimisticTasks(prev => [...prev, newTask]);

    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "CREATE_TASK",
      incident_id: incidentId,
      payload: { 
        taskId: newTask.id,
        title,
        description: "",
        members_required: reqMembers,
        device_id 
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateTask} className="flex flex-col gap-2.5">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="w-full bg-[var(--bg)] border border-gray-700 rounded-full px-3.5 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-between items-center gap-2">
          <label className="text-[11px] text-gray-400 flex items-center gap-1.5 shrink-0">
            Members Required:
            <input 
              type="number" 
              min="1" 
              value={membersRequired} 
              onChange={(e) => setMembersRequired(Number(e.target.value) || 1)}
              className="bg-[var(--bg)] border border-gray-700 rounded-md px-1.5 py-1 text-xs text-[var(--ink)] w-12 text-center focus:outline-none focus:border-[var(--ink)]"
            />
          </label>
          <button type="submit" disabled={!newTaskTitle.trim()} className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity shrink-0 whitespace-nowrap">
            Add Task
          </button>
        </div>
      </form>

      {allTasks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No tasks assigned.</p>
      ) : (
        <div className="space-y-3">
          {allTasks.map(task => (
            <TaskCard key={task.id} task={task} incidentId={incidentId} isTeamMember={isTeamMember} />
          ))}
        </div>
      )}
    </div>
  );
}
