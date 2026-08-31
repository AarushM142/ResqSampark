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
import { ResourcesTab } from "@/app/components/ResourcesTab";
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
            <option value="LOW">LOW</option>
            <option value="MODERATE">MODERATE</option>
            <option value="CRITICAL">CRITICAL</option>
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
          className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-sm font-semibold px-4 py-2 transition-opacity"
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



export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const navigate = usePageTransition();
  const { isOffline, manualOffline } = useConnectivity();
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
      setTeamActionError(null);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `incident_id=eq.${id}` }, () => fetchIncident())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchIncident())
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
        // Queued — only happens on a genuine network failure (server errors now throw).
        const reason = manualOffline
          ? "Offline Mode is ON — disable it in the top bar to apply changes live"
          : "Network unavailable — action queued for next sync";
        setTeamActionError(`ℹ️ ${reason}`);
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

  const needed = incident.team_size_needed - incident.team_members.length;

  return (
    <div className={`mx-auto px-4 py-6 space-y-6 transition-[max-width] duration-300 ${activeTab === "COORDINATION" ? "max-w-5xl" : "max-w-2xl"}`}>
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
        <div className="rounded-lg bg-[var(--bg-soft)] overflow-hidden">
          {/* Removed hazard-stripe */}
          <div className="flex items-start justify-between gap-3 flex-wrap p-4">
            <div className="flex items-center gap-3">
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
      <div className="flex gap-6 border-b border-gray-800 overflow-x-auto scrollbar-hide mb-6">
        {(["OVERVIEW", "TEAM", "RESOURCES", "COORDINATION", "ACTIVITY"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-3 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === tab
                ? "border-gray-100 text-gray-100"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase().replace("_", " ")}
            {tab === "COORDINATION" && hasUnreadCoordination && (
              <span className="absolute top-0.5 -right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
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
                    className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-xs font-semibold px-4 py-2 rounded-full transition-opacity"
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
                    className="bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity"
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
              <div className="rounded-lg bg-[var(--bg-soft)] p-3 space-y-0.5">
                <p className="text-gray-500 text-xs">Location</p>
                <p className="text-gray-200 font-medium">{incident.location}</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-soft)] p-3 space-y-0.5">
                <p className="text-gray-500 text-xs">Affected</p>
                <p className="text-gray-200 font-medium">{incident.affected_count.toLocaleString("en-IN")} people</p>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg-soft)] p-3">
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
              <div className="flex gap-2 flex-wrap pt-2">
                <button
                  id="edit-incident-btn"
                  onClick={() => setEditing(true)}
                  className="rounded-md bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold px-4 py-2 transition-colors"
                >
                  Edit details
                </button>
                {!deleteConfirm ? (
                  <button
                    id="delete-incident-btn"
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-md bg-transparent border border-red-900/30 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-semibold px-4 py-2 transition-colors"
                  >
                    Delete incident
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
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-sm font-semibold px-3.5 py-1.5 transition-opacity"
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
                  className="rounded-full border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50 text-sm font-semibold px-3.5 py-1.5 transition-colors"
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
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-sm font-semibold px-3.5 py-1.5 transition-opacity"
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
                  className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] text-sm font-semibold px-3.5 py-1.5 transition-opacity"
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
          <ResourcesTab 
            incident={incident} 
            setIncident={setIncident} 
            myDeviceId={myDeviceId} 
          />
        )}

        {/* COORDINATION TAB (Tasks & Chat) */}
        {activeTab === "COORDINATION" && (
          <CoordinationTab
             incidentId={incident.id}
             tasks={incident.tasks || []}
             chatMessages={incident.chatMessages || []}
             isTeamMember={myDeviceId ? incident.team_members.includes(myDeviceId) : false}
             isTeamLeader={myDeviceId ? incident.team_leader === myDeviceId : false}
             teamMembers={incident.team_members}
             teamLeader={incident.team_leader}
             teamSizeNeeded={incident.team_size_needed}
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
