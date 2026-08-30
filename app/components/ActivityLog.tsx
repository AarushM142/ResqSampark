"use client";
// app/components/ActivityLog.tsx
// Renders the activity_log array for an incident's detail view.
// Pure display — no logic, just formats timestamps and strings.

import type { ActivityLogEntry } from "@/types";

export function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-gray-500 text-sm italic">No activity yet.</p>;
  }

  return (
    <ol className="space-y-1 font-mono rounded-lg border border-gray-800 bg-gray-900 p-2">
      {[...entries].reverse().map((entry, i) => (
        <li
          key={i}
          className="flex gap-3 text-[13px] rounded-md px-2 py-1.5 hover:bg-gray-800/60 transition-colors"
        >
          <span className="text-green-500/70 shrink-0">&gt;</span>
          <span className="text-gray-500 shrink-0 tabular-nums w-32">
            {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
          <span className="text-gray-300">{entry.action}</span>
        </li>
      ))}
    </ol>
  );
}
