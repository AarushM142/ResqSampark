"use client";
// app/components/ResourceRequestForm.tsx
// Resource request form with preset Low/Med/High/Critical quantity buttons per item type.
// Spec locked decision: preset buttons auto-fill a realistic number, still editable.
// Water presets: Low=50, Medium=150, High=300, Critical=500 bottles (from spec example).

import { useState } from "react";
import { apiOrQueue } from "@/lib/apiOrQueue";
import { useConnectivity } from "@/lib/useConnectivity";

interface ResourceItems {
  food?: number;
  water?: number;
  medicine?: number;
  medical_team?: boolean;
  shelter?: boolean;
  transport?: boolean;
}

// Preset quantities per item (from spec's locked decisions)
const QUANTITY_PRESETS = {
  food: { Low: 25, Medium: 75, High: 150, Critical: 300 },     // meal packs
  water: { Low: 50, Medium: 150, High: 300, Critical: 500 },    // bottles
  medicine: { Low: 20, Medium: 50, High: 100, Critical: 200 },  // units
};

function QuantityInput({
  label,
  field,
  value,
  presets,
  onChange,
}: {
  label: string;
  field: keyof typeof QUANTITY_PRESETS;
  value: number | undefined;
  presets: Record<string, number>;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-700">{label}</label>
      <div className="flex gap-2">
        <select
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          value={value && Object.values(presets).includes(value) ? value : ""}
          className="flex-1 min-w-0 rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950 shadow-2xs"
        >
          <option value="">Preset...</option>
          {Object.entries(presets).map(([lbl, qty]) => (
            <option key={lbl} value={qty}>
              {lbl} ({qty})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Custom qty"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="flex-1 min-w-0 rounded-lg border border-zinc-300 bg-white text-zinc-950 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-zinc-950 shadow-2xs"
        />
      </div>
    </div>
  );
}

export function ResourceRequestForm({
  incidentId,
  onCreated,
}: {
  incidentId: string;
  onCreated: () => void;
}) {
  const [items, setItems] = useState<ResourceItems>({});
  const [priority, setPriority] = useState<"LOW" | "MODERATE" | "CRITICAL">("MODERATE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOffline } = useConnectivity();

  function updateItem<K extends keyof ResourceItems>(key: K, value: ResourceItems[K]) {
    setItems((prev) => ({ ...prev, [key]: value }));
  }

  const hasAnyItem =
    items.food ||
    items.water ||
    items.medicine ||
    items.medical_team ||
    items.shelter ||
    items.transport;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyItem) {
      setError("Please select at least one resource item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Import device_id lazily — client-side only
      const { getDeviceId } = await import("@/lib/deviceId");
      const device_id = getDeviceId();

      // Clean up empty/false items
      const cleanedItems: ResourceItems = {};
      if (items.food) cleanedItems.food = items.food;
      if (items.water) cleanedItems.water = items.water;
      if (items.medicine) cleanedItems.medicine = items.medicine;
      if (items.medical_team) cleanedItems.medical_team = true;
      if (items.shelter) cleanedItems.shelter = true;
      if (items.transport) cleanedItems.transport = true;

      await apiOrQueue({
        isOffline,
        method: "POST",
        url: `/api/incidents/${incidentId}/resources`,
        action_type: "RESOURCE_REQUEST",
        incident_id: incidentId,
        payload: {
          items: cleanedItems,
          priority,
          device_id
        }
      });

      // Reset form
      setItems({});
      setPriority("MODERATE");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border-2 border-zinc-200 bg-white p-4.5 shadow-xs animate-fade-in-up">
      <h3 className="font-black text-zinc-950 text-sm">Request Resources</h3>

      {/* Quantity items */}
      <div className="space-y-3">
        <QuantityInput
          label="Water (bottles)"
          field="water"
          value={items.water}
          presets={QUANTITY_PRESETS.water}
          onChange={(v) => updateItem("water", v)}
        />
        <QuantityInput
          label="Food (meal packs)"
          field="food"
          value={items.food}
          presets={QUANTITY_PRESETS.food}
          onChange={(v) => updateItem("food", v)}
        />
        <QuantityInput
          label="Medicine (units)"
          field="medicine"
          value={items.medicine}
          presets={QUANTITY_PRESETS.medicine}
          onChange={(v) => updateItem("medicine", v)}
        />
      </div>

      {/* Boolean items */}
      <div className="space-y-1.5">
        <label className="console-label text-xs font-bold text-zinc-700">Additional Resources</label>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: "medical_team", label: "Medical Team" },
              { key: "shelter", label: "Shelter" },
              { key: "transport", label: "Transport" },
            ] as { key: keyof ResourceItems; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateItem(key, !items[key] as ResourceItems[typeof key])}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                items[key]
                  ? "bg-zinc-950 border-zinc-950 text-white shadow-2xs"
                  : "bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500 hover:text-zinc-950"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <label className="console-label text-xs font-bold text-zinc-700">Priority Level</label>
        <div className="flex gap-2 flex-wrap">
          {(["LOW", "MODERATE", "CRITICAL"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                priority === p
                  ? p === "CRITICAL"
                    ? "bg-red-50 border-2 border-red-400 text-red-700 shadow-2xs"
                    : p === "MODERATE"
                    ? "bg-amber-50 border-2 border-amber-400 text-amber-800 shadow-2xs"
                    : "bg-emerald-50 border-2 border-emerald-400 text-emerald-800 shadow-2xs"
                  : "bg-white border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          id="submit-resource-btn"
          disabled={submitting || !hasAnyItem}
          className="w-full rounded-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 transition-all shadow-xs"
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
