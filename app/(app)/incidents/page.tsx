"use client";
// app/incidents/page.tsx
// Incident list with status filter. Fetches from /api/incidents, auto-refreshes.
// Client component so we can handle the filter dropdown interactively.

import { useEffect, useState, useCallback } from "react";
import type { Incident } from "@/types";
import { IncidentCard } from "@/app/components/IncidentCard";

type StatusFilter = "ALL" | "UNASSIGNED" | "RECRUITING" | "IN_PROGRESS" | "RESOLVED";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All Incidents" },
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "RECRUITING", label: "Recruiting" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const url =
        filter === "ALL"
          ? "/api/incidents"
          : `/api/incidents?status=${filter}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch incidents");
      const data: Incident[] = await res.json();
      setIncidents(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("disaster-portal:cached-incidents", JSON.stringify(data));
      }
      setError(null);
    } catch (e) {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("disaster-portal:cached-incidents");
        if (cached) {
          try {
            const parsed: Incident[] = JSON.parse(cached);
            const filtered = filter === "ALL" ? parsed : parsed.filter((i) => i.status === filter);
            setIncidents(filtered);
            setError(null);
            return;
          } catch {}
        }
      }
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial load + re-fetch on filter change
  useEffect(() => {
    setLoading(true);
    fetchIncidents();
  }, [fetchIncidents]);

  // Poll every 10s so new incidents from other tabs appear automatically
  useEffect(() => {
    const interval = setInterval(fetchIncidents, 10_000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-100 leading-tight">
          Incidents
        </h1>
        <p className="text-[13px] text-gray-500 leading-tight flex items-center gap-1.5 mt-0.5">
          <span className="relative inline-flex w-1.5 h-1.5 text-green-500">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500" />
            <span className="radar-ping" />
          </span>
          Live — Disaster Coordination Network
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap rounded-full border border-gray-800 bg-gray-900 p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`filter-${opt.value.toLowerCase()}`}
              onClick={() => setFilter(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                filter === opt.value
                  ? "bg-[var(--ink)] text-white"
                  : "bg-transparent text-gray-500 hover:text-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          id="refresh-btn"
          onClick={fetchIncidents}
          className="ml-auto px-3.5 py-1.5 rounded-full text-[13px] text-gray-500 hover:text-gray-200 border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Incident list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-4 h-[132px] overflow-hidden relative"
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-gray-800/40 to-transparent" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400 text-sm">
          Error: {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-gray-600 animate-fade-in-up">
          <p className="text-4xl mb-3">📋</p>
          <p>No incidents {filter !== "ALL" ? `with status ${filter}` : "yet"}.</p>
          {filter !== "ALL" && (
            <button
              onClick={() => setFilter("ALL")}
              className="mt-2 text-sm text-blue-400 hover:underline cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="console-label text-[11px] text-gray-600 tabular-nums">
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""} tracked
          </p>
          {incidents.map((incident, i) => (
            <div
              key={incident.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
            >
              <IncidentCard incident={incident} onRefresh={fetchIncidents} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
