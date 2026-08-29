// app/api/incidents/[id]/resources/route.ts
// POST /api/incidents/:id/resources — create a resource request

import { NextRequest, NextResponse } from "next/server";
import type { ResourceRequest, ActivityLogEntry } from "@/types";
import { getIncident, addResourceRequest, updateIncident } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { items, priority, device_id } = body;

  const incident = await getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  if (incident.deleted) {
    return NextResponse.json({ error: "Incident has been deleted" }, { status: 410 });
  }
  if (!items || !priority) {
    return NextResponse.json(
      { error: "items and priority are required" },
      { status: 400 }
    );
  }

  const validPriorities = ["LOW", "MODERATE", "CRITICAL"];
  if (!validPriorities.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const now = Date.now();

  const req_resource: ResourceRequest = {
    id: crypto.randomUUID(),
    incident_id: id,
    items,
    priority: priority as "LOW" | "MODERATE" | "CRITICAL",
    status: "PENDING",
    created_at: now,
  };

  // Add the resource request and log the activity
  const updated = await addResourceRequest(id, req_resource);
  if (!updated) {
    return NextResponse.json({ error: "Failed to add resource request" }, { status: 500 });
  }

  // Append activity log entry
  const logEntry: ActivityLogEntry = {
    timestamp: now,
    device_id: device_id ?? "unknown",
    action: `Resource request created (${priority} priority) by Worker ${String(device_id ?? "unknown").slice(0, 8)}`,
  };
  await updateIncident(id, (inc) => ({
    ...inc,
    activity_log: [...inc.activity_log, logEntry],
    last_updated: now,
  }));

  const final = await getIncident(id);
  return NextResponse.json(final, { status: 201 });
}
