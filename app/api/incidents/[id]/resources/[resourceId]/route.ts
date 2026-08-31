// app/api/incidents/[id]/resources/[resourceId]/route.ts
// PATCH /api/incidents/:id/resources/:resourceId — update resource request status
// Status chain: PENDING → ACCEPTED → DELIVERED (forward only); CANCELLED only via incident resolve

import { NextRequest, NextResponse } from "next/server";
import { getIncident, updateResourceRequest, updateIncident } from "@/lib/store";

type Params = { params: Promise<{ id: string; resourceId: string }> };

const RESOURCE_STATUS_ORDER = ["PENDING", "ACCEPTED", "DELIVERED"] as const;
type ResourceStatus = (typeof RESOURCE_STATUS_ORDER)[number] | "CANCELLED";

function isForward(current: ResourceStatus, next: ResourceStatus): boolean {
  const ci = RESOURCE_STATUS_ORDER.indexOf(current as (typeof RESOURCE_STATUS_ORDER)[number]);
  const ni = RESOURCE_STATUS_ORDER.indexOf(next as (typeof RESOURCE_STATUS_ORDER)[number]);
  if (ci === -1 || ni === -1) return false;
  return ni > ci;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, resourceId } = await params;
  const body = await req.json();
  const { new_status, device_id } = body;

  if (!new_status) {
    return NextResponse.json({ error: "new_status required" }, { status: 400 });
  }

  const incident = await getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const resource = incident.resource_requests.find((r) => r.id === resourceId);
  if (!resource) {
    return NextResponse.json({ error: "Resource request not found" }, { status: 404 });
  }

  // Only allow forward moves; CANCELLED is not a manual option (auto-set on incident RESOLVED)
  if (new_status === "CANCELLED") {
    return NextResponse.json(
      { error: "CANCELLED status is set automatically when the incident is resolved" },
      { status: 400 }
    );
  }

  if (!isForward(resource.status, new_status)) {
    return NextResponse.json(
      { error: `Cannot move resource status from ${resource.status} to ${new_status}` },
      { status: 409 }
    );
  }

  const now = Date.now();

  // Format items for nice display in the activity log
  const itemsText = Object.entries(resource.items)
    .filter(([_, v]) => v)
    .map(([k, v]) => {
      const name = k.replace("_", " ");
      return typeof v === "boolean" ? name : `${v} ${name}`;
    })
    .join(", ");

  const actionMsg = new_status === "ACCEPTED" 
    ? `Request for ${itemsText} was accepted`
    : new_status === "DELIVERED"
    ? `${itemsText} was delivered`
    : `Resource status changed to ${new_status} for ${itemsText}`;

  await updateResourceRequest(id, resourceId, (r) => ({
    ...r,
    status: new_status as ResourceStatus,
  }));

  // Log the resource status change to the incident activity log
  await updateIncident(id, (inc) => ({
    ...inc,
    last_updated: now,
    activity_log: [
      ...inc.activity_log,
      {
        timestamp: now,
        device_id: device_id ?? "unknown",
        action: actionMsg,
      },
    ],
  }));

  const updated = await getIncident(id);
  return NextResponse.json(updated);
}
