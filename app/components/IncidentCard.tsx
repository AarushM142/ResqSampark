"use client";
// app/components/IncidentCard.tsx
// Incident list card. Displays type/location/severity/affected/status.
// Locked visual treatment per spec: RECRUITING shows "Needs N more", IN_PROGRESS shows "Team active".

import { TransitionLink } from "@/app/components/TransitionLink";
import type { Incident } from "@/types";
import { SeverityBadge, StatusBadge } from "./StatusBadge";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";
import { useState } from "react";

const TYPE_EMOJI: Record<string, string> = {
  FLOOD: "🌊",
  FIRE: "🔥",
  EARTHQUAKE: "🌍",
  LANDSLIDE: "⛰️",
  OTHER: "⚠️",
};

export function IncidentCard({ incident, onRefresh }: { incident: Incident, onRefresh?: () => void }) {
  const { isOffline } = useConnectivity();
  const [claiming, setClaiming] = useState(false);
  const emoji = TYPE_EMOJI[incident.type] ?? "⚠️";
  const needed = incident.team_size_needed - incident.team_members.length;

  async function handleClaim(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    setClaiming(true);
    const device_id = getDeviceId();
    await apiOrQueue({
      isOffline,
      method: "PATCH",
      url: `/api/incidents/${incident.id}`,
      action_type: "CLAIM",
      incident_id: incident.id,
      payload: { device_id }
    });
    setClaiming(false);
    
    if (onRefresh) onRefresh();
  }

  const isCritical = incident.severity === "CRITICAL";

  return (
    <TransitionLink
      href={`/incidents/${incident.id}`}
      direction="forward"
      className={`group block rounded-2xl border bg-[var(--bg)] hover:border-[var(--ink)]/25 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 ease-out p-4 space-y-3 relative overflow-hidden ${
        isCritical ? "border-[var(--accent)]/30" : "border-gray-800"
      }`}
    >
      {isCritical && <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe" />}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0 w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
            {emoji}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-100 truncate">
              {incident.type} — {incident.location}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {incident.location} · ID {incident.id.slice(0, 6)}
            </p>
          </div>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>

      {/* Affected + status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-gray-400">
          {incident.affected_count.toLocaleString("en-IN")} affected
        </span>
        <div className="flex items-center gap-3">
          {incident.status === "UNASSIGNED" && (
            <button
              disabled={claiming}
              onClick={handleClaim}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-default"
            >
              {claiming ? "Claiming…" : "Claim"}
            </button>
          )}
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Team progress sub-line for RECRUITING / IN_PROGRESS */}
      {incident.status === "RECRUITING" && (
        <div className="space-y-1">
          <p className="text-xs" style={{ color: "var(--amber-text)" }}>
            {incident.team_members.length}/{incident.team_size_needed} team —{" "}
            {needed > 0 ? `Needs ${needed} more` : "Team full, ready to start"}
          </p>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((incident.team_members.length / Math.max(1, incident.team_size_needed)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      )}
      {incident.status === "IN_PROGRESS" && (
        <p className="text-xs" style={{ color: "var(--blue-text)" }}>
          Team active — {incident.team_members.length} members
        </p>
      )}

      {/* Description preview */}
      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{incident.description}</p>

      {/* Footer: resource requests count + updated time */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-800 font-mono">
        <span>
          {incident.resource_requests.length > 0
            ? `${incident.resource_requests.length} resource request${incident.resource_requests.length > 1 ? "s" : ""}`
            : "No resource requests yet"}
        </span>
        <span>
          {new Date(incident.last_updated).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>
    </TransitionLink>
  );
}
