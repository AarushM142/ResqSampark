"use client";
// app/components/IncidentCard.tsx
// Incident list card. Displays type/location/severity/affected/status.
// Locked visual treatment per spec: RECRUITING shows "Needs N more", IN_PROGRESS shows "Team active".

import Link from "next/link";
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

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 hover:border-gray-700 transition-colors p-4 space-y-3 relative"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{emoji}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-100 truncate">
              {incident.type} — {incident.location}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              📍 {incident.location}
            </p>
          </div>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>

      {/* Affected + status row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-gray-400">
          👥 {incident.affected_count.toLocaleString("en-IN")} affected
        </span>
        <div className="flex items-center gap-3">
          {incident.status === "UNASSIGNED" && (
            <button 
              disabled={claiming}
              onClick={handleClaim}
              className="text-xs font-semibold px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {claiming ? "Claiming..." : "🙋 Claim Incident"}
            </button>
          )}
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Team progress sub-line for RECRUITING / IN_PROGRESS */}
      {incident.status === "RECRUITING" && (
        <p className="text-xs text-amber-400">
          🟡 {incident.team_members.length}/{incident.team_size_needed} team —{" "}
          {needed > 0 ? `Needs ${needed} more` : "Team full, ready to start"}
        </p>
      )}
      {incident.status === "IN_PROGRESS" && (
        <p className="text-xs text-blue-400">
          🔵 Team active — {incident.team_members.length} members
        </p>
      )}

      {/* Description preview */}
      <p className="text-sm text-gray-500 line-clamp-2">{incident.description}</p>

      {/* Footer: resource requests count + updated time */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-800">
        <span>
          {incident.resource_requests.length > 0
            ? `📦 ${incident.resource_requests.length} resource request${incident.resource_requests.length > 1 ? "s" : ""}`
            : "No resource requests yet"}
        </span>
        <span>
          Updated{" "}
          {new Date(incident.last_updated).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>
    </Link>
  );
}
