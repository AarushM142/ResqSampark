"use client";
// app/components/ActivityLog.tsx
// Renders the activity_log array for an incident's detail view.
// Pure display — no logic, just formats timestamps and strings.

import type { ActivityLogEntry } from "@/types";

export function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-zinc-500 text-xs italic py-4 text-center font-medium">No activity logged yet.</p>;
  }

  return (
    <ol className="space-y-1 font-mono rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
      {[...entries].reverse().map((entry, i) => (
        <li
          key={i}
          className="flex gap-3 text-xs rounded-lg px-2.5 py-1.5 hover:bg-zinc-200/60 transition-colors"
        >
          <span className="text-emerald-600 font-bold shrink-0">&gt;</span>
          <span className="text-zinc-500 font-medium shrink-0 tabular-nums w-24 sm:w-28">
            {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
          <span className="text-zinc-900 font-medium">{entry.action}</span>
        </li>
      ))}
    </ol>
  );
}
