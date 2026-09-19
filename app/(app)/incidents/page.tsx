"use client";
// app/incidents/page.tsx
// Incident list with status filter. Fetches from /api/incidents, auto-refreshes.
// Client component so we can handle the filter dropdown interactively.

import { useEffect, useState, useCallback, Suspense } from "react";
import type { Incident } from "@/types";
import { IncidentCard } from "@/app/components/IncidentCard";
import { useSearchParams, useRouter } from "next/navigation";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const currentView = searchParams.get("view");

  const pageTitle =
    currentView === "teams"
      ? "Response Teams"
      : currentView === "resources"
      ? "Resource Requests"
      : currentView === "incidents"
      ? "Incidents"
      : "Dashboard";

  const pageSubtitle =
    currentView === "teams"
      ? "Field Team Rosters & Mutual Aid Deployment"
      : currentView === "resources"
      ? "Emergency Supplies & Logistics Dispatch"
      : currentView === "incidents"
      ? "Live Incident Dispatch & Crisis Feed"
      : "Live — Disaster Coordination Network";

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

  const displayedIncidents = incidents.filter((incident) => {
    if (currentView === "resources") {
      return incident.resource_requests && incident.resource_requests.length > 0;
    }
    if (currentView === "teams") {
      return incident.team_members && incident.team_members.length > 0;
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 leading-tight">
          {pageTitle}
        </h1>
        <p className="text-[13px] text-zinc-600 font-medium leading-tight flex items-center gap-1.5 mt-1">
          <span className="relative inline-flex w-2 h-2 text-emerald-500">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
            <span className="radar-ping" />
          </span>
          {pageSubtitle}
        </p>
      </div>

      {/* Status filter bar styled with the exact same animated underline as NavigationMenu */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-0.5 flex-wrap">
        <div className="flex items-center space-x-5 sm:space-x-7 overflow-x-auto scrollbar-hide py-1">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                id={`filter-${opt.value.toLowerCase()}`}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "group relative inline-flex items-center justify-center py-2 px-0.5 font-bold text-[13.5px] transition-colors cursor-pointer whitespace-nowrap",
                  "before:absolute before:inset-x-0 before:bottom-0 before:h-[2.5px] before:bg-zinc-950 before:rounded-full before:transition-transform before:duration-200 before:ease-out",
                  isActive
                    ? "text-zinc-950 before:scale-x-100"
                    : "text-zinc-500 before:scale-x-0 hover:text-zinc-950 hover:before:scale-x-100"
                )}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <button
          id="refresh-btn"
          onClick={fetchIncidents}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <RotateCw className={cn("w-3.5 h-3.5", loading ? "animate-spin text-zinc-950" : "text-zinc-500")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Incident list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 h-[132px] overflow-hidden relative flex flex-col justify-between animate-pulse"
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-zinc-200 shrink-0" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="h-4 bg-zinc-200 rounded w-1/3" />
                  <div className="h-3 bg-zinc-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : displayedIncidents.length === 0 ? (
        <div className="text-center py-12 border border-zinc-200 rounded-2xl bg-zinc-50 text-zinc-500 font-medium">
          <p>No incidents {filter !== "ALL" ? `with status ${filter}` : "found for this view"}.</p>
          {(filter !== "ALL" || currentView) && (
            <button
              onClick={() => {
                setFilter("ALL");
                if (currentView) router.push("/incidents");
              }}
              className="mt-2 text-sm text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Show all incidents
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="console-label text-[11px] text-zinc-500 font-bold tabular-nums uppercase tracking-wider">
            {displayedIncidents.length} incident{displayedIncidents.length !== 1 ? "s" : ""} tracked
          </p>
          {displayedIncidents.map((incident, i) => (
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
    <Suspense fallback={<div className="p-12 text-center text-zinc-500 font-medium text-sm">Loading dashboard…</div>}>
      <IncidentsList />
    </Suspense>
  );
}
