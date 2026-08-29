import type { Task, Subtask } from "@/types";
import { useState } from "react";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";

function TaskCard({ task, incidentId, isTeamMember }: { task: Task, incidentId: string, isTeamMember: boolean }) {
  const { isOffline } = useConnectivity();
  const checkedCount = task.subtasks.filter(s => s.checked).length;
  const totalCount = task.subtasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const statusColors = {
    TODO: "bg-gray-800 text-gray-300",
    IN_PROGRESS: "bg-blue-900/40 text-blue-300 border border-blue-800",
    DONE: "bg-green-900/40 text-green-300 border border-green-800"
  };

  async function handleSubtaskCheck(subtaskId: string, checked: boolean) {
    const device_id = getDeviceId();
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "SET_SUBTASK_CHECKED",
      incident_id: incidentId,
      payload: { 
        subtaskId, 
        checked, 
        clientTimestamp: Date.now(), 
        device_id 
      }
    });
  }

  return (
    <div className="border border-gray-800 bg-gray-900 rounded-lg p-3 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-medium text-gray-200 text-sm leading-tight">{task.title}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${statusColors[task.status]}`}>
          {task.status.replace("_", " ")}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500">{task.description}</p>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Progress</span>
            <span>{checkedCount}/{totalCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignees */}
      {task.assigneeIds.length > 0 ? (
        <div className="text-[10px] text-gray-500 flex gap-1 flex-wrap">
          <span className="text-gray-400">Assigned:</span>
          {task.assigneeIds.map(id => (
            <span key={id} className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">
              Worker {id.slice(0, 4)}…
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-gray-600 italic">Unassigned</p>
      )}

      {/* Subtasks (Read-only for now) */}
      {totalCount > 0 && (
        <div className="pt-2 border-t border-gray-800 space-y-1.5">
          {task.subtasks.map(sub => (
            <label key={sub.id} className="flex items-start gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={sub.checked} 
                disabled={!isTeamMember}
                onChange={(e) => handleSubtaskCheck(sub.id, e.target.checked)}
                className="mt-0.5 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className={`text-xs ${sub.checked ? 'text-gray-500 line-through' : 'text-gray-300 group-hover:text-gray-100'}`}>
                {sub.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskList({ tasks, incidentId, isTeamMember }: { tasks: Task[], incidentId: string, isTeamMember: boolean }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const { isOffline } = useConnectivity();

  const allTasks = [...tasks, ...optimisticTasks].reduce((acc, task) => {
    if (!acc.some(t => t.id === task.id)) {
      acc.push(task);
    }
    return acc;
  }, [] as Task[]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle(""); // Optimistic clear

    const device_id = getDeviceId();
    const newTask: Task = {
      id: crypto.randomUUID(),
      incidentId: incidentId,
      title,
      description: "",
      status: "TODO",
      assigneeIds: [],
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
        device_id 
      }
    });
  }

  return (
    <div className="space-y-4">
      {isTeamMember && (
        <form onSubmit={handleCreateTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={!newTaskTitle.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shrink-0">
            Add
          </button>
        </form>
      )}

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
