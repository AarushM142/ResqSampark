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
    TODO: "bg-zinc-100 text-zinc-800 border border-zinc-300",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-300",
    DONE: "bg-emerald-50 text-emerald-800 border border-emerald-300"
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
      <div className="border-2 border-zinc-300 bg-zinc-50 rounded-2xl p-3.5 space-y-3 shadow-xs">
        <input 
          type="text" 
          value={editTitle} 
          onChange={e => setEditTitle(e.target.value)} 
          className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-sm text-zinc-950 font-semibold focus:outline-none focus:border-zinc-950" 
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-700 font-bold">Members Req:</label>
          <input 
            type="number" min="1" value={editReq} onChange={e => setEditReq(Number(e.target.value) || 1)} 
            className="w-16 bg-white border border-zinc-300 rounded px-2 py-1 text-xs text-zinc-950 font-bold focus:outline-none focus:border-zinc-950 text-center" 
          />
        </div>
        
        {/* Add Subtask in Edit Mode */}
        <div className="pt-2 border-t border-zinc-200">
          <label className="text-xs text-zinc-700 font-bold mb-1.5 block">Add Subtask Checklist Item:</label>
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input 
              type="text" 
              value={newSubtask} 
              onChange={e => setNewSubtask(e.target.value)} 
              placeholder="e.g. Bring ladder" 
              className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-400 font-medium focus:outline-none focus:border-zinc-950" 
            />
            <button type="submit" disabled={!newSubtask.trim()} className="px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors">Add</button>
          </form>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-full text-xs font-bold border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 transition-colors">Cancel</button>
          <button onClick={handleSaveEdit} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 shadow-xs transition-colors">Save Task</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-zinc-200 hover:border-zinc-300 bg-white rounded-2xl p-3.5 space-y-3 shadow-2xs transition-all ${task.status === "DONE" ? "opacity-75" : ""}`}>
      <div className="flex justify-between items-start gap-2">
        <h4 className={`font-bold text-zinc-950 text-sm leading-tight break-words flex-1 min-w-0 ${task.status === "DONE" ? "line-through text-zinc-400" : ""}`}>{task.title}</h4>
        
        {/* Status Dropdown */}
        <div className="relative shrink-0">
          <select 
            value={task.status} 
            onChange={handleStatusChange}
            className={`console-label text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer focus:outline-none appearance-none pr-5 ${statusColors[task.status]}`}
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
        <p className={`text-xs break-words whitespace-pre-wrap ${task.status === "DONE" ? "text-zinc-400" : "text-zinc-600 font-medium"}`}>{task.description}</p>
      )}

      {/* Transparency: Completed By */}
      {task.status === "DONE" && task.statusChangedBy && (
        <p className="text-[10px] text-emerald-700 font-mono font-semibold">
          Completed by WORKER-{task.statusChangedBy.slice(0, 4).toUpperCase()}
        </p>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && task.status !== "DONE" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-zinc-600">
            <span>Progress</span>
            <span>{checkedCount}/{totalCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-zinc-100 border border-zinc-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-zinc-950 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignees */}
      <div className="text-[10px] text-zinc-600 flex gap-1 flex-wrap items-center">
        <span className="console-label text-zinc-600 font-bold">Assigned ({task.assigneeIds.length}/{task.members_required || 1}):</span>
        {task.assigneeIds.length > 0 ? (
          task.assigneeIds.map(id => (
            <span key={id} className="font-mono bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-900 font-bold flex items-center gap-1">
              WORKER-{id.slice(0, 4).toUpperCase()}
              {(isTeamMember || id === deviceId) && task.status !== "DONE" && (
                <button onClick={() => handleRemoveAssignee(id)} className="text-zinc-500 hover:text-red-600 font-bold ml-0.5">×</button>
              )}
            </span>
          ))
        ) : (
          <span className="italic text-zinc-400 font-medium">None</span>
        )}
        {isFull && !isAssignee && task.status !== "DONE" && <span className="text-amber-800 font-bold ml-1">(Fully Staffed)</span>}
      </div>

      {/* Subtasks */}
      {totalCount > 0 && (
        <div className="pt-2 border-t border-zinc-100 space-y-1.5">
          {task.subtasks.map(sub => (
            <label key={sub.id} className="flex items-start gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={sub.checked} 
                onChange={(e) => handleSubtaskCheck(sub.id, e.target.checked)}
                className="mt-0.5 rounded border-zinc-400 text-blue-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className={`text-xs break-words min-w-0 flex-1 font-medium ${sub.checked ? 'text-zinc-400 line-through' : 'text-zinc-800 group-hover:text-zinc-950'}`}>
                {sub.label}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      {task.status !== "DONE" && (
        <div className="pt-2 border-t border-zinc-100 flex gap-2 flex-wrap">
          <button 
            onClick={handleToggleAssign} 
            disabled={!canClaim}
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${isAssignee ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {isAssignee ? "Leave Task" : "Claim Task"}
          </button>
          <button 
            onClick={() => setEditing(true)} 
            className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-100 transition-colors shadow-2xs"
          >
            Edit
          </button>
          <button 
            onClick={handleDelete} 
            className="text-[10px] px-2.5 py-1 rounded-full font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors shadow-2xs"
          >
            Delete
          </button>
        </div>
      )}
      
      {/* Optional minimal delete for done tasks */}
      {task.status === "DONE" && (
        <div className="flex justify-end pt-1">
          <button onClick={handleDelete} className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors">Delete Task</button>
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
          className="w-full bg-white border-2 border-zinc-300 rounded-full px-3.5 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 font-semibold focus:outline-none focus:border-zinc-950 shadow-2xs"
        />
        <div className="flex justify-between items-center gap-2">
          <label className="text-[11px] text-zinc-700 font-bold flex items-center gap-1.5 shrink-0">
            Members Required:
            <input 
              type="number" 
              min="1" 
              value={membersRequired} 
              onChange={(e) => setMembersRequired(Number(e.target.value) || 1)}
              className="bg-white border border-zinc-300 rounded-md px-1.5 py-1 text-xs text-zinc-950 font-bold w-12 text-center focus:outline-none focus:border-zinc-950"
            />
          </label>
          <button type="submit" disabled={!newTaskTitle.trim()} className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap shadow-xs">
            Add Task
          </button>
        </div>
      </form>

      {allTasks.length === 0 ? (
        <p className="text-xs text-zinc-500 font-medium text-center py-6 italic">No tasks assigned.</p>
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
