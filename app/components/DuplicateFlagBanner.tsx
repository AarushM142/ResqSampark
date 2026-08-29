"use client";
// app/components/DuplicateFlagBanner.tsx
// Shown when an incident has related_incident_ids populated (possible duplicate flag from /api/sync).
// Merge = keep the link (human to review later). Dismiss = clears related_incident_ids for confirmed distinct incidents.
// Per spec: "flag them non-blockingly (sync still completes) with a quick merge/dismiss action"

import Link from "next/link";

interface Props {
  incidentId: string;
  relatedIds: string[];
  onDismiss: () => void; // caller refreshes incident after dismissal
}

export function DuplicateFlagBanner({ incidentId, relatedIds, onDismiss }: Props) {
  if (relatedIds.length === 0) return null;

  async function handleDismiss() {
    // Dismiss = clear related_incident_ids via an EDIT_INCIDENT PATCH
    // Assumption: passing related_incident_ids=[] to the edit endpoint clears the flag.
    // We do this directly via fetch — not through apiOrQueue — because this is a deliberate
    // human decision that should apply immediately (guardrail: no scope creep, keep it simple).
    try {
      const { getDeviceId } = await import("@/lib/deviceId");
      const device_id = getDeviceId();
      await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "DISMISS_DUPLICATE",
          device_id,
        }),
      });
      onDismiss();
    } catch {
      // Best effort — if it fails the banner stays
    }
  }

  return (
    <div className="rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-yellow-400 text-lg">⚠️</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-yellow-300">
            Possible Duplicate Incident
          </p>
          <p className="text-xs text-yellow-400/80">
            This incident was flagged as a possible duplicate of{" "}
            {relatedIds.length === 1 ? "another incident" : `${relatedIds.length} other incidents`}{" "}
            with the same type and location reported within 30 minutes.
            A human should review and confirm whether these are separate events.
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {relatedIds.map((id) => (
          <Link
            key={id}
            href={`/incidents/${id}`}
            className="text-xs px-2 py-1 rounded border border-yellow-700 text-yellow-400 hover:text-yellow-200 hover:border-yellow-500 transition-colors"
          >
            View {id.slice(0, 8)}…
          </Link>
        ))}
        <button
          id="dismiss-duplicate-btn"
          onClick={handleDismiss}
          className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
        >
          ✕ Dismiss (confirmed distinct)
        </button>
      </div>
    </div>
  );
}
