"use client";
// app/incidents/page.tsx
// Incident list with status filter. Fetches from /api/incidents, auto-refreshes.
// Client component so we can handle the filter dropdown interactively.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Incident } from "@/types";
import { IncidentCard } from "@/app/components/IncidentCard";

type StatusFilter = "ALL" | "UNASSIGNED" | "RECRUITING" | "IN_PROGRESS" | "RESOLVED";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All Incidents" },
  { value: "UNASSIGNED", label: "🔴 Unassigned" },
  { value: "RECRUITING", label: "🟡 Recruiting" },
  { value: "IN_PROGRESS", label: "🔵 In Progress" },
  { value: "RESOLVED", label: "🟢 Resolved" },
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">
            SahayLink
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Disaster Coordination Portal
          </p>
        </div>
        <Link
          href="/incidents/new"
          id="report-incident-btn"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 text-sm transition-colors"
        >
          ＋ Report Incident
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            id={`filter-${opt.value.toLowerCase()}`}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              filter === opt.value
                ? "bg-gray-700 border-gray-500 text-gray-100"
                : "bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          id="refresh-btn"
          onClick={fetchIncidents}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-200 border border-gray-800 hover:border-gray-600 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Incident list */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">
          Loading incidents…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400 text-sm">
          Error: {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p>No incidents {filter !== "ALL" ? `with status ${filter}` : "yet"}.</p>
          {filter !== "ALL" && (
            <button
              onClick={() => setFilter("ALL")}
              className="mt-2 text-sm text-blue-400 hover:underline"
            >
              Show all
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 tabular-nums">
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
          </p>
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} onRefresh={fetchIncidents} />
          ))}
        </div>
      )}
    </div>
  );
}
