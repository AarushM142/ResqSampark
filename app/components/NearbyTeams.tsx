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

const TYPE_EMOJI: Record<string, string> = {
  FLOOD: "🌊",
  FIRE: "🔥",
  EARTHQUAKE: "🌍",
  LANDSLIDE: "⛰️",
  OTHER: "⚠️",
};

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
        messageId: crypto.randomUUID(),
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
        className="flex-1 min-w-0 bg-[var(--bg)] border border-gray-700 rounded-full px-3.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={handleSend}
        disabled={sending || !body.trim()}
        className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 transition-opacity shrink-0"
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-100 text-sm">Nearby Teams</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Other active teams currently working in {incident.location} — reach out to coordinate.
        </p>
      </div>

      {nearby.length === 0 ? (
        <p className="text-sm text-gray-600 italic">No other active teams nearby right now.</p>
      ) : (
        <div className="space-y-2">
          {nearby.map((n) => (
            <div key={n.id} className="rounded-lg border border-gray-800 bg-[var(--bg)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{TYPE_EMOJI[n.type] ?? "⚠️"}</span>
                  <div className="min-w-0">
                    <TransitionLink href={`/incidents/${n.id}`} direction="forward" className="text-sm font-medium text-gray-100 hover:underline truncate block">
                      {n.type} team
                    </TransitionLink>
                    <p className="text-[11px] text-gray-500">
                      {n.team_members.length} responder{n.team_members.length !== 1 ? "s" : ""} · {n.status.replace("_", " ").toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenId(openId === n.id ? null : n.id)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white transition-colors shrink-0"
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
