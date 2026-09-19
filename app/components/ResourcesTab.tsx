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
          <h2 className="font-black text-zinc-950 text-base">Resource Requests</h2>
          {incident.status !== "RESOLVED" && !incident.deleted && (
            <button
              id="toggle-resource-form-btn"
              onClick={() => setShowResourceForm((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 hover:border-zinc-950 text-zinc-800 font-bold bg-white shadow-2xs md:hidden"
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
        <h3 className="font-black text-zinc-950 text-base hidden md:block">Active Requests</h3>
        
        {incident.resource_requests.filter(r => r.status !== "DELIVERED" && r.status !== "CANCELLED").length === 0 ? (
          <div className="text-center py-12 border border-zinc-200 rounded-2xl bg-zinc-50 border-dashed">
            <p className="text-xs text-zinc-500 font-medium italic">No active resource requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {incident.resource_requests
              .filter(r => r.status !== "DELIVERED" && r.status !== "CANCELLED")
              .map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border bg-white p-4 text-sm space-y-3 overflow-hidden shadow-xs hover:border-zinc-400 transition-colors ${
                  req.priority === "CRITICAL" ? "border-red-300 ring-2 ring-red-50" : "border-zinc-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${req.priority === "CRITICAL" ? "text-red-700" : req.priority === "MODERATE" ? "text-amber-800" : "text-zinc-700"}`}>
                    Priority: {req.priority}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      req.status === "PENDING"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : req.status === "ACCEPTED"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : req.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-zinc-100 text-zinc-600 border-zinc-300"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                
                <div className="text-zinc-950 text-xs font-mono bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <ul className="space-y-1">
                    {Object.entries(req.items)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <li key={k} className="flex justify-between">
                          <span className="capitalize font-semibold text-zinc-700">{k.replace("_", " ")}</span>
                          <span className="text-zinc-950 font-bold">
                            {typeof v === "boolean" ? "Yes" : v}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
                
                {/* Status advance buttons */}
                {req.status !== "DELIVERED" && req.status !== "CANCELLED" && (
                  <div className="flex gap-2 pt-2 border-t border-zinc-100">
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
                        className="w-full mt-1 text-xs py-2 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white transition-opacity font-bold shadow-xs"
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
                        className="w-full mt-1 text-xs py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-bold shadow-xs"
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
