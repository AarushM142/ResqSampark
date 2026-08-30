import type { Task, ChatMessage } from "@/types";
import { ChatFeed } from "./ChatFeed";
import { TaskList } from "./TaskList";

export function CoordinationTab({ 
  incidentId, tasks, chatMessages, isTeamMember, isTeamLeader 
}: { 
  incidentId: string, tasks: Task[], chatMessages: ChatMessage[], isTeamMember: boolean, isTeamLeader: boolean 
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 h-[550px]">
      {/* Task List (Mobile: Collapsible strip, Desktop: Left Column) */}
      <div className="w-full md:w-[35%] border border-gray-800 rounded-2xl bg-gray-900 p-4 overflow-y-auto hidden md:block shadow-lg shadow-black/10">
        <h3 className="font-semibold text-gray-200 mb-4 flex justify-between items-center">
          Tasks
          <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">{tasks.length}</span>
        </h3>
        <TaskList tasks={tasks} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>

      {/* Mobile Task Strip */}
      <div className="w-full md:hidden border border-gray-800 rounded-2xl bg-gray-900 p-3 flex justify-between items-center cursor-pointer">
        <span className="font-semibold text-gray-300 text-sm">Tasks ({tasks.length})</span>
        <span className="text-gray-500 text-xs">Tap to view</span>
      </div>

      {/* Chat Feed */}
      <div className="w-full md:w-[65%] flex flex-col h-full">
        <h3 className="font-semibold text-gray-200 mb-2 md:hidden">Chat Feed</h3>
        <ChatFeed messages={chatMessages} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>
    </div>
  );
}
