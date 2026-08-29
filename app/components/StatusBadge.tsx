"use client";
// app/components/StatusBadge.tsx
// Renders severity or status with the locked color/icon treatment from the spec.

import type { Incident } from "@/types";

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

type Severity = Incident["severity"];

const SEVERITY_CONFIG: Record<Severity, { label: string; classes: string }> = {
  CRITICAL: {
    label: "🔴 CRITICAL",
    classes: "bg-red-900/60 text-red-300 border border-red-700",
  },
  MODERATE: {
    label: "🟠 MODERATE",
    classes: "bg-orange-900/60 text-orange-300 border border-orange-700",
  },
  LOW: {
    label: "🟡 LOW",
    classes: "bg-yellow-900/40 text-yellow-300 border border-yellow-700",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge — locked visual treatment per spec's "Locked decisions"
// UNASSIGNED = red/urgent, RECRUITING = amber, IN_PROGRESS = blue, RESOLVED = green muted
// ---------------------------------------------------------------------------

type Status = Incident["status"];

const STATUS_CONFIG: Record<
  Status,
  { label: string; classes: string }
> = {
  UNASSIGNED: {
    label: "🔴 UNASSIGNED",
    classes: "bg-red-900/60 text-red-200 border border-red-700",
  },
  RECRUITING: {
    label: "🟡 RECRUITING",
    classes: "bg-amber-900/60 text-amber-200 border border-amber-600",
  },
  IN_PROGRESS: {
    label: "🔵 IN PROGRESS",
    classes: "bg-blue-900/60 text-blue-200 border border-blue-700",
  },
  RESOLVED: {
    label: "🟢 RESOLVED",
    classes: "bg-green-900/40 text-green-300 border border-green-700",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
