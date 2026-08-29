"use client";
// app/incidents/new/page.tsx
// Report incident form — all fields, severity auto-suggest + override, location dropdown.
// Phase 4: wired through apiOrQueue() so create works offline too.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDeviceId } from "@/lib/deviceId";
import { useConnectivity } from "@/lib/useConnectivity";
import { apiOrQueue } from "@/lib/apiOrQueue";
import type { Incident } from "@/types";

// Locked location list per spec's Locked decisions
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

// Severity auto-suggest thresholds per spec's Locked decisions
function autoSeverity(count: number): "LOW" | "MODERATE" | "CRITICAL" {
  if (count >= 75) return "CRITICAL";
  if (count >= 20) return "MODERATE";
  return "LOW";
}

export default function NewIncidentPage() {
  const router = useRouter();
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
        router.push(`/incidents/${result.data.id}`);
      } else {
        // Queued offline — optimistic: go back to the list
        // (the incident will appear once synced)
        router.push("/incidents");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/incidents"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Back to incidents
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-gray-100">
          Report Incident
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Incident type */}
        <div className="space-y-1.5">
          <label htmlFor="incident-type" className="text-sm font-medium text-gray-300">
            Incident Type
          </label>
          <select
            id="incident-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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
              className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 mt-2"
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
              className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="severity" className="text-sm font-medium text-gray-300">
              Severity
              {!severityOverride && (
                <span className="ml-1 text-gray-500 font-normal">
                  (auto: {suggestedSeverity})
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
              className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">🟡 LOW</option>
              <option value="MODERATE">🟠 MODERATE</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
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
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            id="submit-incident-btn"
            disabled={submitting}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm transition-colors"
          >
            {submitting ? "Reporting…" : "Report Incident"}
          </button>
          <Link
            href="/incidents"
            className="rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 font-medium px-4 py-2.5 text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
