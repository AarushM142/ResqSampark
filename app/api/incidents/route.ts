// app/api/incidents/route.ts
// GET /api/incidents — list all non-deleted incidents (sorted, filterable)
// POST /api/incidents — create a new incident

import { NextRequest, NextResponse } from "next/server";
import type { Incident, ActivityLogEntry } from "@/types";
import { getIncidents, createIncident } from "@/lib/store";

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/incidents
// Query params:
//   ?status=UNASSIGNED|RECRUITING|IN_PROGRESS|RESOLVED  (omit for all)
//   ?includeDeleted=true  (omit to exclude deleted — default)
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, MODERATE: 1, LOW: 2 };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const statusFilter = searchParams.get("status");
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  let results = await getIncidents();

  if (!includeDeleted) {
    results = results.filter((i) => !i.deleted);
  }

  if (statusFilter) {
    results = results.filter((i) => i.status === statusFilter);
  }

  // Sort: severity first (CRITICAL → MODERATE → LOW), then most-recently-updated first.
  results = [...results].sort((a, b) => {
    const sev = (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3);
    if (sev !== 0) return sev;
    return b.last_updated - a.last_updated;
  });

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" },
  });
}

// ---------------------------------------------------------------------------
// POST /api/incidents — create an incident
// Body: Partial<Incident> minus server-generated fields
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    type,
    location,
    severity,
    affected_count,
    description,
    team_size_needed,
    device_id,
  } = body;

  // Validate required fields
  if (!type || !location || !affected_count || !description || !device_id) {
    return NextResponse.json(
      { error: "Missing required fields: type, location, affected_count, description, device_id" },
      { status: 400 }
    );
  }

  // Auto-suggest severity from affected_count per spec's locked decision (reporter override respected).
  // Thresholds: <20 → LOW, 20-75 → MODERATE, 75+ → CRITICAL
  function autoSeverity(count: number): "LOW" | "MODERATE" | "CRITICAL" {
    if (count >= 75) return "CRITICAL";
    if (count >= 20) return "MODERATE";
    return "LOW";
  }

  const resolvedSeverity =
    severity && ["LOW", "MODERATE", "CRITICAL"].includes(severity)
      ? (severity as "LOW" | "MODERATE" | "CRITICAL")
      : autoSeverity(Number(affected_count));

  const now = Date.now();

  const logEntry: ActivityLogEntry = {
    timestamp: now,
    device_id,
    // Assumption: log message format "Reported by Worker {short_id}" — short_id = first 8 chars of device_id
    action: `Reported by Worker ${String(device_id).slice(0, 8)}`,
  };

  const incident: Incident = {
    id: crypto.randomUUID(),
    type,
    location,
    severity: resolvedSeverity,
    affected_count: Number(affected_count),
    description,
    status: "UNASSIGNED",
    deleted: false,
    team_size_needed: Number(team_size_needed) || 3,
    team_members: [],
    team_leader: null,
    resource_requests: [],
    activity_log: [logEntry],
    related_incident_ids: [],
    created_at: now,
    last_updated: now,
    tasks: [],
    chatMessages: [],
  };

  await createIncident(incident);

  return NextResponse.json(incident, { status: 201 });
}
