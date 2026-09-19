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
    <div className="space-y-4 rounded-2xl border-2 border-zinc-300 bg-zinc-50 p-4.5 animate-fade-in-up shadow-sm">
      <h3 className="font-black text-zinc-950 text-sm tracking-tight">Edit Incident Details</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950"
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950"
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
              className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs mt-1 font-medium focus:outline-none focus:border-zinc-950"
            />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700">People Affected</label>
          <input
            type="number"
            min={0}
            value={affectedCount}
            onChange={(e) =>
              setAffectedCount(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-700">
            Severity{" "}
            <span className="text-zinc-500 font-normal">
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
            className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950"
          >
            <option value="LOW">LOW</option>
            <option value="MODERATE">MODERATE</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-700">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-medium resize-none focus:outline-none focus:border-zinc-950"
        />
      </div>

      {error && (
        <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold px-4 py-2 transition-colors shadow-2xs"
        >
          Cancel
        </button>
        <button
          id="save-edit-btn"
          onClick={handleSave}
          disabled={submitting}
          className="rounded-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 transition-opacity shadow-xs"
        >
          {submitting ? "Saving…" : "Save Changes"}
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
    setLoading(true);
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-950 animate-spin" />
        <span className="text-xs font-bold">Loading incident…</span>
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
        className="text-xs text-zinc-600 hover:text-zinc-950 font-bold transition-colors inline-flex items-center gap-1"
      >
        ← Back to All Incidents
      </TransitionLink>

      {/* Incident header */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-xs">
          <div className="flex items-start justify-between gap-3 flex-wrap p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 leading-tight">
                  {incident.type} — {incident.location}
                </h1>
                <p className="console-label text-[11px] text-zinc-500 font-semibold mt-1">
                  ID {incident.id.slice(0, 8)} · Opened{" "}
                  {new Date(incident.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 sm:gap-6 border-b border-zinc-200 overflow-x-auto scrollbar-hide mb-6">
        {(["OVERVIEW", "TEAM", "RESOURCES", "COORDINATION", "ACTIVITY"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-3 text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === tab
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase().replace("_", " ")}
            {tab === "COORDINATION" && hasUnreadCoordination && (
              <span className="absolute top-0 -right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
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
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
                <p className="text-sm text-blue-900 font-bold">This incident is currently unassigned.</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={teamActionPending}
                    onClick={() => performTeamAction({ action_type: "CLAIM" })}
                    className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full transition-opacity shadow-xs"
                  >
                    Claim Incident
                  </button>
                </div>
              </div>
            )}

            {/* Resolved Nudge Banner */}
            {incident.tasks && incident.tasks.length > 0 && incident.tasks.every(t => t.status === "DONE") && incident.status !== "RESOLVED" && !dismissedResolvedBanner && myDeviceId && incident.team_members.includes(myDeviceId) && (
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
                <p className="text-sm text-emerald-900 font-bold">All tasks complete — mark this incident Resolved?</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={teamActionPending}
                    onClick={() => performTeamAction({ action_type: "STATUS_UPDATE", new_status: "RESOLVED" })}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-opacity shadow-xs"
                  >
                    Yes, Resolve
                  </button>
                  <button
                    onClick={() => setDismissedResolvedBanner(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-0.5">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Location</p>
                <p className="text-zinc-950 font-bold text-sm sm:text-base">{incident.location}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-0.5">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Affected</p>
                <p className="text-zinc-950 font-bold text-sm sm:text-base">{incident.affected_count.toLocaleString("en-IN")} people</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-zinc-800 text-sm leading-relaxed font-normal">{incident.description}</p>
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
              <div className="flex gap-2.5 flex-wrap pt-2">
                <button
                  id="edit-incident-btn"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold px-4 py-2 transition-colors shadow-2xs"
                >
                  Edit details
                </button>
                {!deleteConfirm ? (
                  <button
                    id="delete-incident-btn"
                    onClick={() => setDeleteConfirm(true)}
                    className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-4 py-2 transition-colors shadow-2xs"
                  >
                    Delete incident
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-full border border-red-300 bg-red-50 px-3.5 py-1.5 shadow-2xs">
                    <span className="text-xs text-red-800 font-bold">Delete this incident?</span>
                    <button
                      id="confirm-delete-btn"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs font-bold text-red-700 hover:text-red-900 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs text-zinc-600 hover:text-zinc-900 font-bold transition-colors"
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs animate-fade-in-up">
            <h2 className="font-black text-zinc-950 text-base">Team Status</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Team size needed</p>
                <p className="text-zinc-950 font-bold text-base mt-0.5">{incident.team_size_needed}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Current members</p>
                <p className="text-zinc-950 font-bold text-base mt-0.5">
                  {incident.team_members.length}/{incident.team_size_needed}
                  {needed > 0 && incident.status === "RECRUITING" && (
                    <span className="text-amber-800 text-xs font-bold ml-1.5">— needs {needed} more</span>
                  )}
                </p>
              </div>
            </div>
            {incident.team_leader && (
              <p className="text-xs text-zinc-600 font-medium">
                Leader: <span className="font-mono font-bold text-zinc-950">Worker {incident.team_leader.slice(0, 8)}…</span>
              </p>
            )}
            {incident.team_members.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Members:</p>
                <ul className="space-y-1">
                  {incident.team_members.map((m) => (
                    <li key={m} className="text-xs font-mono font-bold text-zinc-800 flex items-center gap-2">
                      <span>• Worker {m.slice(0, 8)}…</span>
                      {m === incident.team_leader && (
                        <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 font-bold px-1.5 py-0.2 rounded uppercase">(leader)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {teamActionError && (
              <p className="text-xs text-red-600 font-bold mt-1 bg-red-50 p-2 rounded-lg border border-red-200">{teamActionError}</p>
            )}
            <div className="flex gap-2.5 flex-wrap pt-2">
              {/* CLAIM: only from UNASSIGNED */}
              {incident.status === "UNASSIGNED" && (
                <button
                  id="claim-btn"
                  disabled={teamActionPending}
                  onClick={() => performTeamAction({ action_type: "CLAIM" })}
                  className="rounded-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 shadow-xs transition-opacity"
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
                  className="rounded-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 shadow-xs transition-all"
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
                  className="rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold px-4 py-2 shadow-2xs transition-colors"
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
                  className="rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors"
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
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </div>

            {/* Nearby Teams */}
            {incident.status !== "UNASSIGNED" && myDeviceId && incident.team_members.includes(myDeviceId) && (
              <div className="pt-2">
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs animate-fade-in-up">
            <h2 className="font-black text-zinc-950 text-base">Activity Log</h2>
            <ActivityLog entries={incident.activity_log} />
          </section>
        )}
      </div>
    </div>
  );
}
