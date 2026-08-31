import { useState } from "react";
import type { Task, ChatMessage } from "@/types";
import { ChatFeed } from "./ChatFeed";
import { TaskList } from "./TaskList";

export function CoordinationTab({ 
  incidentId, tasks, chatMessages, isTeamMember, isTeamLeader, teamMembers, teamLeader, teamSizeNeeded
}: { 
  incidentId: string, tasks: Task[], chatMessages: ChatMessage[], isTeamMember: boolean, isTeamLeader: boolean, teamMembers: string[], teamLeader: string | null, teamSizeNeeded: number
}) {
  const [showMobileTasks, setShowMobileTasks] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[600px]">
      {/* Task List (Desktop: Left Column) */}
      <div className="w-full lg:w-[280px] lg:shrink-0 p-2 overflow-y-auto overflow-x-hidden hidden lg:block border-r border-gray-800/50">
        <h3 className="font-semibold text-gray-200 mb-4 flex justify-between items-center">
          Tasks
          <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">{tasks.length}</span>
        </h3>
        <TaskList tasks={tasks} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>

      {/* Mobile Task Strip / Drawer */}
      <div className="w-full lg:hidden border border-gray-800 rounded-2xl bg-gray-900 overflow-hidden flex flex-col">
        <div 
          onClick={() => setShowMobileTasks(!showMobileTasks)}
          className="p-3 flex justify-between items-center cursor-pointer bg-gray-900"
        >
          <span className="font-semibold text-gray-300 text-sm">Tasks ({tasks.length})</span>
          <span className="text-gray-500 text-xs">{showMobileTasks ? "Hide" : "Tap to view"}</span>
        </div>
        
        {showMobileTasks && (
          <div className="p-4 pt-0 border-t border-gray-800 bg-gray-900 overflow-y-auto overflow-x-hidden max-h-[300px]">
            <TaskList tasks={tasks} incidentId={incidentId} isTeamMember={isTeamMember} />
          </div>
        )}
      </div>

      {/* Chat Feed */}
      <div className="w-full flex-1 flex flex-col h-[500px] lg:h-full min-w-0 px-2">
        <h3 className="font-semibold text-gray-200 mb-2 lg:hidden">Chat Feed</h3>
        <ChatFeed messages={chatMessages} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>

      {/* Members List (Desktop: Right Column) */}
      <div className="w-full lg:w-[240px] lg:shrink-0 p-2 overflow-y-auto overflow-x-hidden hidden lg:block border-l border-gray-800/50">
        <h3 className="font-semibold text-gray-200 mb-4 flex justify-between items-center">
          Members
          <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">{teamMembers.length}/{teamSizeNeeded}</span>
        </h3>
        <div className="space-y-3">
          {teamMembers.map(m => (
            <div key={m} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="w-8 h-8 rounded-full bg-[var(--ink)] flex items-center justify-center text-[var(--bg)] font-mono text-xs shadow-sm">
                {m.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">Worker {m.slice(0, 8)}</p>
                {m === teamLeader && (
                  <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">Team Leader</p>
                )}
              </div>
            </div>
          ))}
          {teamMembers.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4">No team members yet.</p>
          )}
        </div>
      </div>

      {/* Mobile Members Strip / Drawer */}
      <div className="w-full lg:hidden border border-gray-800 rounded-2xl bg-gray-900 overflow-hidden flex flex-col">
        <div 
          onClick={() => setShowMobileMembers(!showMobileMembers)}
          className="p-3 flex justify-between items-center cursor-pointer bg-gray-900"
        >
          <span className="font-semibold text-gray-300 text-sm">Members ({teamMembers.length}/{teamSizeNeeded})</span>
          <span className="text-gray-500 text-xs">{showMobileMembers ? "Hide" : "Tap to view"}</span>
        </div>
        
        {showMobileMembers && (
          <div className="p-4 pt-0 border-t border-gray-800 bg-gray-900 overflow-y-auto max-h-[300px]">
            <div className="space-y-3 pt-2">
              {teamMembers.map(m => (
                <div key={m} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="w-8 h-8 rounded-full bg-[var(--ink)] flex items-center justify-center text-[var(--bg)] font-mono text-xs shadow-sm">
                    {m.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">Worker {m.slice(0, 8)}</p>
                    {m === teamLeader && (
                      <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">Team Leader</p>
                    )}
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">No team members yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
