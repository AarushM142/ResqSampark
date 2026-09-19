"use client";
// app/components/NearbyTeams.tsx
// Once a worker has claimed/joined an incident, this surfaces other active
// teams working the same location so the two teams can coordinate directly.
//
// There's no phone/SMS infrastructure in this app (workers are anonymous
// per-device, no phone numbers on file) — so "contact" is implemented as a
// message dropped straight into that team's own coordination chat, reusing
// the existing per-incident chat pipe instead of a real phone call.

import { useEffect, useState, useCallback } from "react";
import { TransitionLink } from "@/app/components/TransitionLink";
import type { Incident } from "@/types";
import { apiOrQueue } from "@/lib/apiOrQueue";
import { useConnectivity } from "@/lib/useConnectivity";
import { generateUUID } from "@/lib/deviceId";



function MessageComposer({
  target,
  fromIncident,
  myDeviceId,
  onSent,
}: {
  target: Incident;
  fromIncident: Incident;
  myDeviceId: string;
  onSent: () => void;
}) {
  const { isOffline } = useConnectivity();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${target.id}`,
      action_type: "POST_CHAT_MESSAGE",
      incident_id: target.id,
      payload: {
        messageId: generateUUID(),
        body: body.trim(),
        clientTimestamp: Date.now(),
        authorName: `Worker ${myDeviceId.slice(0, 4)} · ${fromIncident.type} team nearby`,
        device_id: myDeviceId,
      },
    });
    setSending(false);
    setSent(true);
    setBody("");
    onSent();
  }

  if (sent) {
    return <p className="text-xs mt-2" style={{ color: "var(--green-text)" }}>Sent to their coordination chat.</p>;
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Message the ${target.type} team…`}
        className="flex-1 min-w-0 bg-white border border-zinc-300 rounded-full px-3.5 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-400 font-medium focus:outline-none focus:border-zinc-950 shadow-2xs"
      />
      <button
        onClick={handleSend}
        disabled={sending || !body.trim()}
        className="rounded-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 transition-all shrink-0 shadow-xs"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </div>
  );
}

export function NearbyTeams({
  incident,
  myDeviceId,
}: {
  incident: Incident;
  myDeviceId: string;
}) {
  const [nearby, setNearby] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchNearby = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      if (!res.ok) return;
      const all: Incident[] = await res.json();
      const sameArea = all.filter(
        (i) =>
          i.id !== incident.id &&
          !i.deleted &&
          i.status !== "RESOLVED" &&
          i.team_members.length > 0 &&
          i.location.trim().toLowerCase() === incident.location.trim().toLowerCase()
      );
      setNearby(sameArea);
    } finally {
      setLoading(false);
    }
  }, [incident.id, incident.location]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div>
        <h3 className="font-bold text-zinc-950 text-sm">Nearby Active Teams</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Other active teams currently working in {incident.location} — coordinate directly.
        </p>
      </div>

      {nearby.length === 0 ? (
        <p className="text-xs text-zinc-500 font-medium italic">No other active teams nearby right now.</p>
      ) : (
        <div className="space-y-2">
          {nearby.map((n) => (
            <div key={n.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs shrink-0 font-bold bg-zinc-100 px-2 py-0.5 rounded text-zinc-900 border border-zinc-300">{n.type.slice(0,2)}</span>
                  <div className="min-w-0">
                    <TransitionLink href={`/incidents/${n.id}`} direction="forward" className="text-xs font-bold text-zinc-950 hover:underline truncate block">
                      {n.type} team
                    </TransitionLink>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      {n.team_members.length} responder{n.team_members.length !== 1 ? "s" : ""} · {n.status.replace("_", " ").toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenId(openId === n.id ? null : n.id)}
                  className="text-xs font-bold px-3 py-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 transition-colors shrink-0 shadow-2xs"
                >
                  {openId === n.id ? "Cancel" : "Message"}
                </button>
              </div>
              {openId === n.id && (
                <MessageComposer
                  target={n}
                  fromIncident={incident}
                  myDeviceId={myDeviceId}
                  onSent={() => setTimeout(() => setOpenId(null), 1500)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
