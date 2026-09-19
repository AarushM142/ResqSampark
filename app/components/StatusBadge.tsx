"use client";
// app/components/StatusBadge.tsx
// Renders severity or status with the locked color/icon treatment from the spec.

import type { Incident } from "@/types";

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

type Severity = Incident["severity"];

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: {
    label: "Critical",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
    dot: "bg-red-600",
  },
  MODERATE: {
    label: "Moderate",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${
          severity === "CRITICAL" ? "animate-alarm-blink" : ""
        }`}
      />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge — locked visual treatment per spec's "Locked decisions"
// UNASSIGNED = red/urgent, RECRUITING = amber, IN_PROGRESS = blue, RESOLVED = green
// ---------------------------------------------------------------------------

type Status = Incident["status"];

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; border: string; dot: string }> = {
  UNASSIGNED: {
    label: "Unassigned",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-300",
    dot: "bg-rose-600",
  },
  RECRUITING: {
    label: "Recruiting",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
    dot: "bg-blue-600",
  },
  RESOLVED: {
    label: "Resolved",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    dot: "bg-emerald-600",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNASSIGNED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${
          status === "UNASSIGNED" ? "animate-alarm-blink" : ""
        }`}
      />
      {cfg.label}
    </span>
  );
}
