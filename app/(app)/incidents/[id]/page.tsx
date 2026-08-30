"use client";
// app/incidents/[id]/page.tsx
// Incident detail view.
// Phase 1: shows all fields, edit core fields inline, soft-delete with confirm, activity log.
// Phase 2: adds Claim/Join/Leave/Status buttons.
// Phase 3: adds resource request section.
// Phase 4: wires all writes through apiOrQueue() + adds SyncBar.

import { useEffect, useState, useCallback } from "react";
import { TransitionLink } from "@/app/components/TransitionLink";
import { usePageTransition } from "@/lib/PageTransitionContext";
import type { Incident } from "@/types";
import { SeverityBadge, StatusBadge } from "@/app/components/StatusBadge";
import { ActivityLog } from "@/app/components/ActivityLog";
import { ResourceRequestForm } from "@/app/components/ResourceRequestForm";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";
import { DuplicateFlagBanner } from "@/app/components/DuplicateFlagBanner";
import { CoordinationTab } from "@/app/components/CoordinationTab";
import { NearbyTeams } from "@/app/components/NearbyTeams";
import { supabase } from "@/lib/supabaseClient";

const INCIDENT_TYPES = ["FLOOD", "FIRE", "EARTHQUAKE", "LANDSLIDE", "OTHER"];
const LOCATIONS = [
  "Chinchwad",
  "Nashik Industrial Belt",
  "Pune",
  "Mumbai",
  "Thane",
  "Nagpur",
  "Aurangabad",
  "Solapur",
];

// ---------------------------------------------------------------------------
// Severity auto-suggest (same logic as /incidents/new)
// ---------------------------------------------------------------------------
function autoSeverity(count: number): "LOW" | "MODERATE" | "CRITICAL" {
  if (count >= 75) return "CRITICAL";
  if (count >= 20) return "MODERATE";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Edit form (inline)
// ---------------------------------------------------------------------------
function EditForm({
  incident,
  onSave,
  onCancel,
}: {
  incident: Incident;
  onSave: (updated: Incident) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(incident.type);
  const [location, setLocation] = useState(
    LOCATIONS.includes(incident.location) ? incident.location : "Other"
  );
  const [customLocation, setCustomLocation] = useState(
    LOCATIONS.includes(incident.location) ? "" : incident.location
  );
  const [affectedCount, setAffectedCount] = useState<number | "">(
    incident.affected_count
  );
  const [severityOverride, setSeverityOverride] = useState<
    "LOW" | "MODERATE" | "CRITICAL"
  >(incident.severity);
  const [description, setDescription] = useState(incident.description);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveLocation = location === "Other" ? customLocation : location;

  async function handleSave() {
    if (!effectiveLocation.trim()) {
      setError("Please specify a location.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const device_id = getDeviceId();
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "EDIT_INCIDENT",
          type,
          location: effectiveLocation.trim(),
          severity: severityOverride,
          affected_count: Number(affectedCount) || 0,
          description: description.trim(),
          device_id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      const updated: Incident = await res.json();
      onSave(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-blue-800 bg-blue-950/20 p-4 animate-fade-in-up">
      <h3 className="font-semibold text-blue-300">Edit Incident</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-sm"
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-sm"
          >
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          {location === "Other" && (
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Specify location…"
              className="w-full rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-sm mt-1"
            />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">People Affected</label>
          <input
            type="number"
            min={0}
            value={affectedCount}
            onChange={(e) =>
              setAffectedCount(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">
            Severity{" "}
            <span className="text-gray-600">
              (auto: {autoSeverity(Number(affectedCount) || 0)})
            </span>
          </label>
          <select
            value={severityOverride}
            onChange={(e) =>
              setSeverityOverride(
                e.target.value as "LOW" | "MODERATE" | "CRITICAL"
              )
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-sm"
          >
            <option value="LOW">🟡 LOW</option>
            <option value="MODERATE">🟠 MODERATE</option>
            <option value="CRITICAL">🔴 CRITICAL</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1.5 text-sm resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          id="save-edit-btn"
          onClick={handleSave}
          disabled={submitting}
          className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-opacity"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border border-gray-700 hover:border-gray-500 text-gray-400 text-sm px-4 py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail page
// ---------------------------------------------------------------------------

const TYPE_EMOJI: Record<string, string> = {
  FLOOD: "🌊",
  FIRE: "🔥",
  EARTHQUAKE: "🌍",
  LANDSLIDE: "⛰️",
  OTHER: "⚠️",
};

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const navigate = usePageTransition();
  const { isOffline } = useConnectivity();
  const [id, setId] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [teamActionPending, setTeamActionPending] = useState(false);
  // Stable device ID resolved client-side
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  // Phase 3: resource form toggle
  const [showResourceForm, setShowResourceForm] = useState(false);
  // Tabs State
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TEAM" | "RESOURCES" | "COORDINATION" | "ACTIVITY">("OVERVIEW");
  const [hasUnreadCoordination, setHasUnreadCoordination] = useState(false);
  const [dismissedResolvedBanner, setDismissedResolvedBanner] = useState(false);

  useEffect(() => {
    // getDeviceId() only works client-side
    setMyDeviceId(getDeviceId());
  }, []);

  // Check unread status when incident updates or tab changes
  useEffect(() => {
    if (!incident || !id) return;
    // Sort to ensure we're always comparing the true latest message
    const sorted = [...(incident.chatMessages || [])].sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    const latestMessage = sorted[sorted.length - 1];
    const latestTimestamp = latestMessage ? latestMessage.clientTimestamp : 0;
    
    if (activeTab === "COORDINATION") {
      // Mark as read
      localStorage.setItem(`last_read_coord_${id}`, latestTimestamp.toString());
      setHasUnreadCoordination(false);
    } else {
      // Check if unread
      const lastRead = Number(localStorage.getItem(`last_read_coord_${id}`) || "0");
      setHasUnreadCoordination(latestTimestamp > lastRead);
    }
  }, [incident, activeTab, id]);

  // Resolve params (Next.js 15 async params)
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchIncident = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/incidents/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Incident not found");
      const data: Incident = await res.json();
      setIncident(data);
      setError(null);
    } catch (e) {
      setIncident((prev) => {
        if (!prev) {
          // Only set error if we don't have stale data to show
          setError(e instanceof Error ? e.message : "Unknown error");
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load + Realtime subscriptions for instant live updates
  useEffect(() => {
    if (!id) return;
    
    // Initial fetch
    fetchIncident();
    
    // Set up Realtime subscriptions for this incident
    const channel = supabase.channel(`incident-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `id=eq.${id}` }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `incident_id=eq.${id}` }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `incident_id=eq.${id}` }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests', filter: `incident_id=eq.${id}` }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_team_members', filter: `incident_id=eq.${id}` }, () => fetchIncident())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchIncident]);

  async function handleDelete() {
    if (!incident) return;
    setDeleting(true);
    try {
      const device_id = getDeviceId();
      const result = await apiOrQueue({
        isOffline,
        method: "DELETE",
        url: `/api/incidents/${incident.id}`,
        action_type: "DELETE_INCIDENT",
        incident_id: incident.id,
        payload: { device_id },
      });
      if (result.mode === "api") {
        navigate("/incidents", "back");
      } else {
        // Queued offline — optimistic: show deleted locally and return to list
        navigate("/incidents", "back");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  // Phase 2 + 4: team action helper — routes through apiOrQueue()
  async function performTeamAction(body: Record<string, unknown>) {
    if (!incident) return;
    setTeamActionPending(true);
    setTeamActionError(null);
    try {
      const device_id = getDeviceId();
      const actionPayload = { ...body, device_id };
      const actionType = (body.action_type as string) || "EDIT_INCIDENT";

      const result = await apiOrQueue<Incident>({
        isOffline,
        method: "PATCH",
        url: `/api/incidents/${incident.id}`,
        action_type: actionType as Parameters<typeof apiOrQueue>[0]["action_type"],
        incident_id: incident.id,
        payload: actionPayload,
      });

      if (result.mode === "api" && result.data) {
        setIncident(result.data);
      } else {
        // Queued offline — optimistic UI: reflect the action locally
        // Assumption: safe to show a brief toast; we don't attempt to locally simulate
        // server-side state transitions since that's the server's job.
        setTeamActionError(
          `ℹ️ Action queued — will apply on next sync (${isOffline ? "offline" : "network issue"})`
        );
      }
    } catch (e) {
      setTeamActionError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setTeamActionPending(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500 flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-blue-500 animate-spin" />
        Loading incident…
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <TransitionLink href="/incidents" direction="back" className="text-sm text-gray-500 hover:text-gray-300">
          ← Back
        </TransitionLink>
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400 text-sm">
          {error || "Incident not found."}
        </div>
      </div>
    );
  }

  const emoji = TYPE_EMOJI[incident.type] ?? "⚠️";
  const needed = incident.team_size_needed - incident.team_members.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <TransitionLink
        href="/incidents"
        direction="back"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        ← All Incidents
      </TransitionLink>

      {/* Incident header */}
      <div className="space-y-3">
        <div
          className={`rounded-2xl border bg-gray-900/60 overflow-hidden ${
            incident.severity === "CRITICAL" ? "border-[var(--accent)]/30" : "border-gray-800"
          }`}
        >
          {incident.severity === "CRITICAL" && <div className="h-1 hazard-stripe" />}
          <div className="flex items-start justify-between gap-3 flex-wrap p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl w-12 h-12 rounded-2xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center shrink-0">
                {emoji}
              </span>
              <div>
                <h1 className="text-xl font-bold text-gray-100 leading-tight">
                  {incident.type} — {incident.location}
                </h1>
                <p className="console-label text-[11px] text-gray-500 mt-1">
                  ID {incident.id.slice(0, 8)} · Opened{" "}
                  {new Date(incident.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 rounded-full border border-gray-800 bg-gray-900 p-1 overflow-x-auto scrollbar-hide">
        {(["OVERVIEW", "TEAM", "RESOURCES", "COORDINATION", "ACTIVITY"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-[var(--ink)] text-white"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase().replace("_", " ")}
            {tab === "COORDINATION" && hasUnreadCoordination && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]"></span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-2 animate-fade-in-up">
        {/* OVERVIEW TAB */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">

            {/* Claim Nudge Banner */}
            {incident.status === "UNASSIGNED" && (
              <div className="rounded-2xl border border-blue-800 bg-blue-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
                <p className="text-sm text-blue-300">This incident is currently unassigned.</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={teamActionPending}
                    onClick={() => performTeamAction({ action_type: "CLAIM" })}
                    className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-full transition-opacity"
                  >
                    Claim Incident
                  </button>
                </div>
              </div>
            )}

            {/* Resolved Nudge Banner */}
            {incident.tasks && incident.tasks.length > 0 && incident.tasks.every(t => t.status === "DONE") && incident.status !== "RESOLVED" && !dismissedResolvedBanner && myDeviceId && incident.team_members.includes(myDeviceId) && (
              <div className="rounded-2xl border border-green-800 bg-green-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
                <p className="text-sm text-green-300">All tasks complete — mark this incident Resolved?</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={teamActionPending}
                    onClick={() => performTeamAction({ action_type: "STATUS_UPDATE", new_status: "RESOLVED" })}
                    className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity"
                  >
                    Yes, Resolve
                  </button>
                  <button
                    onClick={() => setDismissedResolvedBanner(true)}
                    className="text-xs text-green-600 hover:text-green-500 px-2 py-1 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3 space-y-0.5 hover:border-gray-700 transition-colors">
                <p className="text-gray-500 text-xs">Location</p>
                <p className="text-gray-200 font-medium">{incident.location}</p>
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3 space-y-0.5 hover:border-gray-700 transition-colors">
                <p className="text-gray-500 text-xs">Affected</p>
                <p className="text-gray-200 font-medium">{incident.affected_count.toLocaleString("en-IN")} people</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3">
              <p className="text-gray-500 text-xs mb-1">Description</p>
              <p className="text-gray-200 text-sm leading-relaxed">{incident.description}</p>
            </div>

            {/* Duplicate flag banner (Phase 5) */}
            {incident.related_incident_ids.length > 0 && (
              <DuplicateFlagBanner
                incidentId={incident.id}
                relatedIds={incident.related_incident_ids}
                onDismiss={() => {
                  if (!id) return;
                  fetch(`/api/incidents/${id}`)
                    .then((r) => r.json())
                    .then((data: Incident) => setIncident(data));
                }}
              />
            )}

            {/* Edit form (Phase 1) */}
            {editing && (
              <EditForm
                incident={incident}
                onSave={(updated) => {
                  setIncident(updated);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            )}

            {/* Edit / Delete actions */}
            {!incident.deleted && incident.status !== "RESOLVED" && !editing && (
              <div className="flex gap-2 flex-wrap">
                <button
                  id="edit-incident-btn"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-gray-700 hover:border-[var(--ink)] text-gray-300 hover:text-gray-100 text-sm px-3.5 py-1.5 transition-colors"
                >
                  Edit
                </button>
                {!deleteConfirm ? (
                  <button
                    id="delete-incident-btn"
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-full border border-[var(--accent)]/40 hover:border-[var(--accent)] hover:bg-red-950 text-red-400 hover:text-red-300 text-sm px-3.5 py-1.5 transition-colors"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/20 px-3 py-1.5">
                    <span className="text-sm text-red-300">Delete this incident?</span>
                    <button
                      id="confirm-delete-btn"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm font-semibold text-red-400 hover:text-red-200 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "TEAM" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3 animate-fade-in-up">
            <h2 className="font-semibold text-gray-200">Team</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Team size needed</p>
                <p className="text-gray-200">{incident.team_size_needed}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Current members</p>
                <p className="text-gray-200">
                  {incident.team_members.length}/{incident.team_size_needed}
                  {needed > 0 && incident.status === "RECRUITING" && (
                    <span className="text-amber-400 ml-1">— needs {needed} more</span>
                  )}
                </p>
              </div>
            </div>
            {incident.team_leader && (
              <p className="text-xs text-gray-500">
                Leader: Worker {incident.team_leader.slice(0, 8)}…
              </p>
            )}
            {incident.team_members.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Members:</p>
                <ul className="space-y-0.5">
                  {incident.team_members.map((m) => (
                    <li key={m} className="text-xs text-gray-400">
                      Worker {m.slice(0, 8)}…{" "}
                      {m === incident.team_leader && (
                        <span className="text-amber-400">(leader)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Phase 2 action buttons — only valid next-step actions shown */}
            {teamActionError && (
              <p className="text-xs text-red-400 mt-1">{teamActionError}</p>
            )}
            <div className="flex gap-2 flex-wrap pt-1">
              {/* CLAIM: only from UNASSIGNED */}
              {incident.status === "UNASSIGNED" && (
                <button
                  id="claim-btn"
                  disabled={teamActionPending}
                  onClick={() => performTeamAction({ action_type: "CLAIM" })}
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-1.5 transition-opacity"
                >
                  Claim Incident
                </button>
              )}
              {/* JOIN TEAM: only during RECRUITING or IN_PROGRESS, only if not already a member */}
              {["RECRUITING", "IN_PROGRESS"].includes(incident.status) &&
                myDeviceId && !incident.team_members.includes(myDeviceId) && (
                <button
                  id="join-team-btn"
                  disabled={teamActionPending}
                  onClick={() => performTeamAction({ action_type: "JOIN_TEAM" })}
                  className="rounded-full border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white disabled:opacity-50 text-sm font-semibold px-3.5 py-1.5 transition-colors"
                >
                  Join Team
                </button>
              )}
              {/* LEAVE TEAM: during RECRUITING or IN_PROGRESS, only if a member */}
              {["RECRUITING", "IN_PROGRESS"].includes(incident.status) && myDeviceId && incident.team_members.includes(myDeviceId) && (
                <button
                  id="leave-team-btn"
                  disabled={teamActionPending}
                  onClick={() => performTeamAction({ action_type: "LEAVE_TEAM" })}
                  className="rounded-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-gray-100 text-sm px-3.5 py-1.5 transition-colors"
                >
                  Leave Team
                </button>
              )}
              {/* START WORK: during RECRUITING — any team member can trigger */}
              {incident.status === "RECRUITING" && myDeviceId && incident.team_members.includes(myDeviceId) && (
                <button
                  id="start-work-btn"
                  disabled={teamActionPending}
                  onClick={() =>
                    performTeamAction({ action_type: "STATUS_UPDATE", new_status: "IN_PROGRESS" })
                  }
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-1.5 transition-opacity"
                >
                  Start Work
                </button>
              )}
              {/* MARK RESOLVED: during IN_PROGRESS — any team member can trigger */}
              {incident.status === "IN_PROGRESS" && myDeviceId && incident.team_members.includes(myDeviceId) && (
                <button
                  id="mark-resolved-btn"
                  disabled={teamActionPending}
                  onClick={() =>
                    performTeamAction({ action_type: "STATUS_UPDATE", new_status: "RESOLVED" })
                  }
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-1.5 transition-opacity"
                >
                  Mark Resolved
                </button>
              )}
            </div>

            {/* Nearby Teams — once claimed/joined, coordinate with other active teams in the same area */}
            {incident.status !== "UNASSIGNED" && myDeviceId && incident.team_members.includes(myDeviceId) && (
              <div className="pt-1">
                <NearbyTeams incident={incident} myDeviceId={myDeviceId} />
              </div>
            )}
          </section>
        )}

        {/* RESOURCES TAB */}
        {activeTab === "RESOURCES" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-200">Resource Requests</h2>
              {incident.status !== "RESOLVED" && !incident.deleted && (
                <button
                  id="toggle-resource-form-btn"
                  onClick={() => setShowResourceForm((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-700 hover:border-[var(--ink)] text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showResourceForm ? "Cancel" : "+ Request Resources"}
                </button>
              )}
            </div>

            {showResourceForm && (
              <ResourceRequestForm
                incidentId={incident.id}
                onCreated={() => {
                  setShowResourceForm(false);
                  // Re-fetch to get updated incident with new resource request
                  if (!id) return;
                  fetch(`/api/incidents/${id}`)
                    .then((r) => r.json())
                    .then((data: Incident) => setIncident(data));
                }}
              />
            )}

            {incident.resource_requests.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No resource requests yet.</p>
            ) : (
              <div className="space-y-2">
                {incident.resource_requests.map((req) => (
                  <div
                    key={req.id}
                    className={`rounded-2xl border bg-gray-950/40 p-3 text-sm space-y-2 overflow-hidden ${
                      req.priority === "CRITICAL" ? "border-[var(--accent)]/30" : "border-gray-700"
                    }`}
                  >
                    {req.priority === "CRITICAL" && (
                      <div className="h-1 -mx-3 -mt-3 mb-2 hazard-stripe" />
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-medium text-gray-300">Priority: {req.priority}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          req.status === "PENDING"
                            ? "bg-yellow-900/40 text-yellow-300"
                            : req.status === "ACCEPTED"
                            ? "bg-blue-900/40 text-blue-300"
                            : req.status === "DELIVERED"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs font-mono">
                      {Object.entries(req.items)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (typeof v === "boolean" ? k : `${k}: ${v}`))
                        .join(" · ")}
                    </div>
                    {/* Status advance buttons (forward only, not CANCELLED) */}
    {req.status !== "DELIVERED" && req.status !== "CANCELLED" && (
                      <div className="flex gap-2">
                        {req.status === "PENDING" && (
                          <button
                            id={`accept-resource-${req.id.slice(0, 8)}`}
                            onClick={async () => {
                              const device_id = getDeviceId();
                              const res = await fetch(
                                `/api/incidents/${incident.id}/resources/${req.id}`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ new_status: "ACCEPTED", device_id }),
                                }
                              );
                              if (res.ok) setIncident(await res.json());
                            }}
                            className="text-xs px-2.5 py-1 rounded-full bg-[var(--ink)] hover:opacity-85 text-white transition-opacity font-medium"
                          >
                            Accept
                          </button>
                        )}
                        {req.status === "ACCEPTED" && (
                          <button
                            id={`deliver-resource-${req.id.slice(0, 8)}`}
                            onClick={async () => {
                              const device_id = getDeviceId();
                              const res = await fetch(
                                `/api/incidents/${incident.id}/resources/${req.id}`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ new_status: "DELIVERED", device_id }),
                                }
                              );
                              if (res.ok) setIncident(await res.json());
                            }}
                            className="text-xs px-2.5 py-1 rounded-full bg-[var(--ink)] hover:opacity-85 text-white transition-opacity font-medium"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* COORDINATION TAB (Tasks & Chat) */}
        {activeTab === "COORDINATION" && (
          <CoordinationTab
             incidentId={incident.id}
             tasks={incident.tasks || []}
             chatMessages={incident.chatMessages || []}
             isTeamMember={myDeviceId ? incident.team_members.includes(myDeviceId) : false}
             isTeamLeader={myDeviceId ? incident.team_leader === myDeviceId : false}
          />
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === "ACTIVITY" && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3 animate-fade-in-up">
            <h2 className="font-semibold text-gray-200">Activity Log</h2>
            <ActivityLog entries={incident.activity_log} />
          </section>
        )}
      </div>
    </div>
  );
}
