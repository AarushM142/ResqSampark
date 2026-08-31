"use client";
import { useState, useEffect } from "react";
import { usePageTransition } from "@/lib/PageTransitionContext";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";
import type { Incident } from "@/types";

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

const INCIDENT_TYPES = ["FLOOD", "FIRE", "EARTHQUAKE", "LANDSLIDE", "OTHER"];

function autoSeverity(count: number): "LOW" | "MODERATE" | "CRITICAL" {
  if (count >= 75) return "CRITICAL";
  if (count >= 20) return "MODERATE";
  return "LOW";
}

export function ReportIncidentModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const navigate = usePageTransition();
  const { isOffline } = useConnectivity();

  const [type, setType] = useState("FLOOD");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState("");
  const [affectedCount, setAffectedCount] = useState<number | "">(50);
  const [severityOverride, setSeverityOverride] = useState<"" | "LOW" | "MODERATE" | "CRITICAL">("");
  const [description, setDescription] = useState("");
  const [teamSizeNeeded, setTeamSizeNeeded] = useState<number | "">(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const suggestedSeverity =
    typeof affectedCount === "number" ? autoSeverity(affectedCount) : "MODERATE";
  const effectiveSeverity = severityOverride || suggestedSeverity;
  const effectiveLocation = location === "Other" ? customLocation : location;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveLocation.trim()) {
      setError("Please specify a location.");
      return;
    }
    if (!description.trim()) {
      setError("Please add a description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const device_id = getDeviceId();
      const payload = {
        type,
        location: effectiveLocation.trim(),
        severity: effectiveSeverity,
        affected_count: Number(affectedCount) || 0,
        description: description.trim(),
        team_size_needed: Number(teamSizeNeeded) || 3,
        device_id,
      };

      const result = await apiOrQueue<Incident>({
        isOffline,
        method: "POST",
        url: "/api/incidents",
        action_type: "CREATE_INCIDENT",
        incident_id: null,
        payload,
      });

      if (result.mode === "api" && result.data) {
        onClose();
        navigate(`/incidents/${result.data.id}`, "forward");
      } else {
        // Queued offline — optimistic
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up"
      >
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-100">Report Incident</h2>
              <p className="text-sm text-gray-400 mt-1">Submit a new disaster report to the network.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form id="report-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Incident type */}
            <div className="space-y-1.5">
              <label htmlFor="incident-type" className="text-sm font-medium text-gray-300">
                Incident Type
              </label>
              <select
                id="incident-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-medium text-gray-300">
                Location
              </label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value="Other">Other (specify)</option>
              </select>
              {location === "Other" && (
                <input
                  id="custom-location"
                  type="text"
                  placeholder="Enter location…"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 mt-2 transition-colors"
                />
              )}
            </div>

            {/* Affected count + severity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="affected-count" className="text-sm font-medium text-gray-300">
                  People Affected
                </label>
                <input
                  id="affected-count"
                  type="number"
                  min={0}
                  value={affectedCount}
                  onChange={(e) =>
                    setAffectedCount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="severity" className="text-sm font-medium text-gray-300">
                  Severity
                  {!severityOverride && (
                    <span className="ml-1 text-gray-500 font-normal">
                      (auto)
                    </span>
                  )}
                </label>
                <select
                  id="severity"
                  value={severityOverride || suggestedSeverity}
                  onChange={(e) =>
                    setSeverityOverride(
                      e.target.value as "" | "LOW" | "MODERATE" | "CRITICAL"
                    )
                  }
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition-colors ${
                    (severityOverride || suggestedSeverity) === "CRITICAL" ? "border-red-500/50 bg-red-950/20 text-red-100" :
                    (severityOverride || suggestedSeverity) === "MODERATE" ? "border-orange-500/50 bg-orange-950/20 text-orange-100" :
                    "border-yellow-500/50 bg-yellow-950/20 text-yellow-100"
                  }`}
                >
                  <option value="LOW" className="bg-gray-900 text-gray-100">LOW</option>
                  <option value="MODERATE" className="bg-gray-900 text-gray-100">MODERATE</option>
                  <option value="CRITICAL" className="bg-gray-900 text-gray-100">CRITICAL</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Describe the situation and immediate needs…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"
              />
            </div>

            {/* Team size needed */}
            <div className="space-y-1.5">
              <label htmlFor="team-size" className="text-sm font-medium text-gray-300">
                Team Size Needed
              </label>
              <input
                id="team-size"
                type="number"
                min={1}
                max={50}
                value={teamSizeNeeded}
                onChange={(e) =>
                  setTeamSizeNeeded(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded-xl border border-gray-700 bg-gray-950/50 text-gray-100 px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-red-400 text-sm flex items-start gap-2">
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer sticky action area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/90 backdrop-blur flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-300 font-medium px-5 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="report-form"
            id="submit-incident-btn"
            disabled={submitting}
            className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-[var(--bg)] font-semibold px-6 py-2 text-sm transition-opacity shadow-lg"
          >
            {submitting ? "Reporting…" : "Report Incident"}
          </button>
        </div>
      </div>
    </div>
  );
}
