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
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[620px]">
      {/* Task List (Desktop: Left Column Sidebar) */}
      <div className="w-full lg:w-[320px] lg:shrink-0 p-3.5 overflow-y-auto overflow-x-hidden hidden lg:block border border-zinc-300 bg-white/90 backdrop-blur-md rounded-2xl shadow-xs">
        <h3 className="font-black text-zinc-950 mb-4 flex justify-between items-center text-sm tracking-tight">
          Tasks
          <span className="bg-zinc-950 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs">{tasks.length}</span>
        </h3>
        <TaskList tasks={tasks} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>

      {/* Mobile Task Strip / Drawer */}
      <div className="w-full lg:hidden border-2 border-zinc-300 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col">
        <div 
          onClick={() => setShowMobileTasks(!showMobileTasks)}
          className="p-3.5 flex justify-between items-center cursor-pointer bg-zinc-100 hover:bg-zinc-200/70 transition-colors"
        >
          <span className="font-bold text-zinc-950 text-sm">Tasks ({tasks.length})</span>
          <span className="text-zinc-700 font-bold text-xs">{showMobileTasks ? "Hide ▲" : "Tap to view ▼"}</span>
        </div>
        
        {showMobileTasks && (
          <div className="p-4 pt-2 border-t border-zinc-200 bg-white overflow-y-auto overflow-x-hidden max-h-[320px]">
            <TaskList tasks={tasks} incidentId={incidentId} isTeamMember={isTeamMember} />
          </div>
        )}
      </div>

      {/* Chat Feed */}
      <div className="w-full flex-1 flex flex-col h-[500px] lg:h-full min-w-0 px-2 bg-white/90 backdrop-blur-md rounded-2xl border border-zinc-300 shadow-xs">
        <h3 className="font-bold text-zinc-950 my-2 lg:hidden px-2 text-sm">Chat Feed</h3>
        <ChatFeed messages={chatMessages} incidentId={incidentId} isTeamMember={isTeamMember} />
      </div>

      {/* Members List (Desktop: Right Column Sidebar) */}
      <div className="w-full lg:w-[260px] lg:shrink-0 p-3.5 overflow-y-auto overflow-x-hidden hidden lg:block border border-zinc-300 bg-white/90 backdrop-blur-md rounded-2xl shadow-xs">
        <h3 className="font-black text-zinc-950 mb-4 flex justify-between items-center text-sm tracking-tight">
          Members
          <span className="bg-zinc-950 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs">{teamMembers.length}/{teamSizeNeeded}</span>
        </h3>
        <div className="space-y-2.5">
          {teamMembers.map(m => (
            <div key={m} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-zinc-200 shadow-2xs hover:border-zinc-400 transition-colors">
              <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center text-white font-mono text-xs font-bold shadow-xs shrink-0">
                {m.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-950 truncate">Worker {m.slice(0, 8)}</p>
                {m === teamLeader && (
                  <span className="inline-block text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded uppercase tracking-wider mt-0.5">Team Leader</span>
                )}
              </div>
            </div>
          ))}
          {teamMembers.length === 0 && (
            <p className="text-xs text-zinc-500 font-medium italic text-center py-6">No team members yet.</p>
          )}
        </div>
      </div>

      {/* Mobile Members Strip / Drawer */}
      <div className="w-full lg:hidden border border-zinc-300 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col">
        <div 
          onClick={() => setShowMobileMembers(!showMobileMembers)}
          className="p-3 flex justify-between items-center cursor-pointer bg-zinc-50"
        >
          <span className="font-bold text-zinc-900 text-sm">Members ({teamMembers.length}/{teamSizeNeeded})</span>
          <span className="text-zinc-600 font-semibold text-xs">{showMobileMembers ? "Hide ▲" : "Tap to view ▼"}</span>
        </div>
        
        {showMobileMembers && (
          <div className="p-4 pt-0 border-t border-zinc-200 bg-white overflow-y-auto max-h-[300px]">
            <div className="space-y-2.5 pt-2">
              {teamMembers.map(m => (
                <div key={m} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-zinc-200 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center text-white font-mono text-xs font-bold shadow-xs">
                    {m.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-950 truncate">Worker {m.slice(0, 8)}</p>
                    {m === teamLeader && (
                      <span className="inline-block text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5">Team Leader</span>
                    )}
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-zinc-500 italic text-center py-6">No team members yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
