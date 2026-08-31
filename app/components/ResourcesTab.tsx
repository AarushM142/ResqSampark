"use client";
import { useState } from "react";
import type { Incident } from "@/types";
import { ResourceRequestForm } from "./ResourceRequestForm";
import { getDeviceId } from "@/lib/deviceId";

interface ResourcesTabProps {
  incident: Incident;
  setIncident: (incident: Incident) => void;
  myDeviceId: string | null;
}

export function ResourcesTab({ incident, setIncident, myDeviceId }: ResourcesTabProps) {
  const [showResourceForm, setShowResourceForm] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-fade-in-up">
      {/* LEFT COLUMN: Request Form */}
      <div className="md:col-span-5 lg:col-span-4 space-y-4 md:sticky md:top-20">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-200">Resource Requests</h2>
          {incident.status !== "RESOLVED" && !incident.deleted && (
            <button
              id="toggle-resource-form-btn"
              onClick={() => setShowResourceForm((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-700 hover:border-[var(--ink)] text-gray-400 hover:text-gray-200 transition-colors md:hidden"
            >
              {showResourceForm ? "Cancel" : "+ Request Resources"}
            </button>
          )}
        </div>

        {/* On desktop, always show if not resolved/deleted. On mobile, toggle. */}
        {(showResourceForm || (typeof window !== "undefined" && window.innerWidth >= 768)) && incident.status !== "RESOLVED" && !incident.deleted && (
          <ResourceRequestForm
            incidentId={incident.id}
            onCreated={() => {
              setShowResourceForm(false);
              fetch(`/api/incidents/${incident.id}`)
                .then((r) => r.json())
                .then((data: Incident) => setIncident(data));
            }}
          />
        )}
      </div>

      {/* RIGHT COLUMN: Active Requests List */}
      <div className="md:col-span-7 lg:col-span-8 space-y-3">
        <h3 className="font-semibold text-gray-200 text-sm hidden md:block">Active Requests</h3>
        
        {incident.resource_requests.filter(r => r.status !== "DELIVERED" && r.status !== "CANCELLED").length === 0 ? (
          <div className="text-center py-12 border border-gray-800 rounded-2xl bg-[var(--bg-soft)] border-dashed">
            <p className="text-sm text-gray-500">No active resource requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {incident.resource_requests
              .filter(r => r.status !== "DELIVERED" && r.status !== "CANCELLED")
              .map((req) => (
              <div
                key={req.id}
                className={`rounded-lg border bg-[var(--bg-soft)] p-4 text-sm space-y-3 overflow-hidden shadow-sm hover:border-[var(--ink)] transition-colors ${
                  req.priority === "CRITICAL" ? "border-red-400" : "border-gray-800"
                }`}
              >
                  {/* Removed hazard-stripe */}
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-medium text-gray-300">Priority: {req.priority}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      req.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : req.status === "ACCEPTED"
                        ? "bg-blue-100 text-blue-700"
                        : req.status === "DELIVERED"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                
                <div className="text-[var(--ink)] text-xs font-mono bg-[var(--bg)] p-2 rounded border border-gray-800">
                  <ul className="space-y-1">
                    {Object.entries(req.items)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <li key={k} className="flex justify-between">
                          <span className="capitalize">{k.replace("_", " ")}</span>
                          <span className="text-gray-300 font-medium">
                            {typeof v === "boolean" ? "Yes" : v}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
                
                {/* Status advance buttons */}
                {req.status !== "DELIVERED" && req.status !== "CANCELLED" && (
                  <div className="flex gap-2 pt-2 border-t border-gray-800">
                    {req.status === "PENDING" && (
                      <button
                        id={`accept-resource-${req.id.slice(0, 8)}`}
                        onClick={async () => {
                          const device_id = getDeviceId();
                          const res = await fetch(
                            `/api/incidents/${incident.id}/resources/${req.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ new_status: "ACCEPTED", device_id }),
                            }
                          );
                          if (res.ok) setIncident(await res.json());
                        }}
                        className="w-full mt-2 text-xs py-2 rounded-full bg-[var(--ink)] hover:opacity-85 text-[var(--bg)] transition-opacity font-semibold"
                      >
                        Accept Request
                      </button>
                    )}
                    {req.status === "ACCEPTED" && (
                      <button
                        id={`deliver-resource-${req.id.slice(0, 8)}`}
                        onClick={async () => {
                          const device_id = getDeviceId();
                          const res = await fetch(
                            `/api/incidents/${incident.id}/resources/${req.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ new_status: "DELIVERED", device_id }),
                            }
                          );
                          if (res.ok) setIncident(await res.json());
                        }}
                        className="w-full mt-2 text-xs py-2 rounded-full bg-green-600 hover:bg-green-500 text-white transition-colors font-semibold shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
