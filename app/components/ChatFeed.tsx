import type { ChatMessage } from "@/types";
import { useState, useEffect } from "react";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";

export function ChatFeed({ messages, incidentId, isTeamMember }: { messages: ChatMessage[], incidentId: string, isTeamMember: boolean }) {
  const [body, setBody] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const { isOffline } = useConnectivity();

  // Combine server messages with our un-synced optimistic ones
  // In a real app we'd filter out ones that finally arrived, but for a demo
  // we can rely on page refresh or just basic deduplication if needed.
  // Actually, let's just deduplicate by ID just in case the server syncs them back.
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");

  useEffect(() => {
    try {
      setCurrentDeviceId(getDeviceId());
    } catch {}
  }, []);

  const allMessages = [...messages, ...optimisticMessages].reduce((acc, msg) => {
    if (!acc.some(m => m.id === msg.id)) {
      acc.push(msg);
    }
    return acc;
  }, [] as ChatMessage[]).sort((a, b) => a.clientTimestamp - b.clientTimestamp);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    
    const text = body.trim();
    setBody(""); // Optimistic clear

    const device_id = getDeviceId();
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      incidentId: incidentId,
      authorId: device_id,
      authorName: `Worker ${device_id.slice(0, 4)}…`,
      body: text,
      clientTimestamp: Date.now(),
      syncedAt: null, // null = not yet confirmed by server (optimistic)
    };

    setOptimisticMessages(prev => [...prev, newMsg]);

    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incidentId}`,
      action_type: "POST_CHAT_MESSAGE",
      incident_id: incidentId,
      payload: { 
        messageId: newMsg.id,
        body: newMsg.body, 
        clientTimestamp: newMsg.clientTimestamp, 
        authorName: newMsg.authorName,
        device_id 
      }
    });
  }

  return (
    <div className="flex flex-col h-[500px] border border-gray-800 rounded-2xl bg-[var(--bg)] overflow-hidden shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {allMessages.map(msg => {
        const isMe = msg.authorId === currentDeviceId;
        const isSystem = msg.authorId === 'SYSTEM';

        if (isSystem) {
          return (
            <div key={msg.id} className="flex flex-col items-center">
              <div className="bg-gray-900 text-gray-500 text-[11px] px-3 py-1 rounded-full border border-gray-800 my-1">
                {msg.body}
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-3`}>
            <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`font-mono text-[10px] text-gray-500 mb-1 px-1 flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && <span className="font-semibold text-gray-400">{msg.authorName}</span>}
                <span>{new Date(msg.clientTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className={`px-3.5 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-blue-400 text-white rounded-br-sm' : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm'}`}>
                <p className="text-sm leading-snug">{msg.body}</p>
              </div>
              {isMe && (
                <span className="text-[11px] text-gray-500 mt-1 px-1">
                  {msg.syncedAt ? "Sent" : "Sending..."}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {allMessages.length === 0 && (
        <p className="text-sm text-gray-500 text-center m-auto">No messages yet.</p>
      )}
      </div>
      {isTeamMember ? (
        <form onSubmit={handleSend} className="p-3 border-t border-gray-800 bg-[var(--bg-soft)] flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[var(--bg)] border border-gray-700 rounded-full px-3.5 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={!body.trim()} className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white rounded-full px-4 py-2 text-sm font-semibold transition-opacity">
            Send
          </button>
        </form>
      ) : (
        <div className="p-3 border-t border-gray-800 bg-[var(--bg-soft)] text-center">
          <p className="text-xs text-gray-500">You must join the team to chat.</p>
        </div>
      )}
    </div>
  );
}
