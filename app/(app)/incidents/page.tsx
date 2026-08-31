"use client";
// app/incidents/page.tsx
// Incident list with status filter. Fetches from /api/incidents, auto-refreshes.
// Client component so we can handle the filter dropdown interactively.

import { useEffect, useState, useCallback, Suspense } from "react";
import type { Incident } from "@/types";
import { IncidentCard } from "@/app/components/IncidentCard";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";

type StatusFilter = "ALL" | "UNASSIGNED" | "RECRUITING" | "IN_PROGRESS" | "RESOLVED";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All Incidents" },
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "RECRUITING", label: "Recruiting" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
];

function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const showReportModal = searchParams.get("report") === "true";

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
                  ? "bg-[var(--ink)] text-[var(--bg)]"
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
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 h-[132px] overflow-hidden relative flex flex-col justify-between"
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-gray-800/80 shrink-0" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="w-3/4 h-5 bg-gray-800/80 rounded" />
                  <div className="w-1/3 h-4 bg-gray-800/60 rounded" />
                </div>
              </div>
              <div className="flex justify-between items-center mt-auto pt-2">
                <div className="w-24 h-6 bg-gray-800/80 rounded-full" />
                <div className="w-20 h-6 bg-gray-800/80 rounded-full" />
              </div>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-gray-700/10 to-transparent" />
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
      
      {showReportModal && (
        <ReportIncidentModal 
          onClose={() => router.push("/incidents")} 
          onSuccess={fetchIncidents} 
        />
      )}
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading dashboard...</div>}>
      <IncidentsList />
    </Suspense>
  );
}
