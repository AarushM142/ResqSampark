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

export function IncidentCard({ incident, onRefresh }: { incident: Incident, onRefresh?: () => void }) {
  const { isOffline } = useConnectivity();
  const [claiming, setClaiming] = useState(false);
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
      className={`group block rounded-2xl border bg-white hover:border-zinc-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out p-4.5 space-y-3.5 relative overflow-hidden ${
        isCritical ? "border-red-300 ring-2 ring-red-50" : "border-zinc-200"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-bold text-zinc-950 text-[15px] truncate">
              {incident.type} — {incident.location}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">
              {incident.location} · ID {incident.id.slice(0, 6)}
            </p>
          </div>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>

      {/* Affected + status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-zinc-700">
          {incident.affected_count.toLocaleString("en-IN")} affected
        </span>
        <div className="flex items-center gap-2.5">
          {incident.status === "UNASSIGNED" && (
            <button
              disabled={claiming}
              onClick={handleClaim}
              className="text-xs font-bold px-3.5 py-1 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-default shadow-xs"
            >
              {claiming ? "Claiming…" : "Claim"}
            </button>
          )}
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Team progress sub-line for RECRUITING / IN_PROGRESS */}
      {incident.status === "RECRUITING" && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-amber-800">
            {incident.team_members.length}/{incident.team_size_needed} team —{" "}
            {needed > 0 ? `Needs ${needed} more` : "Team full, ready to start"}
          </p>
          <div className="w-full bg-zinc-100 border border-zinc-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
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
        <p className="text-xs font-bold text-blue-700">
          Team active — {incident.team_members.length} members
        </p>
      )}

      {/* Description preview */}
      <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed">{incident.description}</p>

      {/* Footer: resource requests count + updated time */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-100 font-mono font-medium">
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
