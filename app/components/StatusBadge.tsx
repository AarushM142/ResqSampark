"use client";
// app/components/StatusBadge.tsx
// Renders severity or status with the locked color/icon treatment from the spec.

import type { Incident } from "@/types";

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

type Severity = Incident["severity"];

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  CRITICAL: { label: "Critical", color: "var(--accent)" },
  MODERATE: { label: "Moderate", color: "var(--amber-text)" },
  LOW: { label: "Low", color: "var(--green-text)" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
      style={{ color: cfg.color }}
    >
      {severity === "CRITICAL" && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-alarm-blink"
          style={{ background: cfg.color }}
        />
      )}
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge — locked visual treatment per spec's "Locked decisions"
// UNASSIGNED = red/urgent, RECRUITING = amber, IN_PROGRESS = blue, RESOLVED = green muted
// ---------------------------------------------------------------------------

type Status = Incident["status"];

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  UNASSIGNED: { label: "Unassigned", color: "var(--accent)" },
  RECRUITING: { label: "Recruiting", color: "var(--amber-text)" },
  IN_PROGRESS: { label: "In Progress", color: "var(--blue-text)" },
  RESOLVED: { label: "Resolved", color: "var(--green-text)" },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
      style={{ color: cfg.color }}
    >
      {status === "UNASSIGNED" && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-alarm-blink"
          style={{ background: cfg.color }}
        />
      )}
      {cfg.label}
    </span>
  );
}
