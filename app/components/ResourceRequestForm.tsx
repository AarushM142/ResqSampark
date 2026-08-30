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
      <label className="console-label text-[11px] font-medium text-gray-400">{label}</label>
      <div className="flex gap-1 flex-wrap">
        {Object.entries(presets).map(([label, qty]) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value === qty ? undefined : qty)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
              value === qty
                ? "bg-[var(--ink)] border-[var(--ink)] text-white scale-[1.03]"
                : "bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            }`}
          >
            {label} ({qty})
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        placeholder="Custom quantity"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        className="w-full rounded border border-gray-700 bg-gray-900 text-gray-100 px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
      />
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-4 animate-fade-in-up">
      <h3 className="font-semibold text-gray-100 text-sm">Request Resources</h3>

      {/* Quantity items */}
      <div className="space-y-3">
        <QuantityInput
          label="💧 Water (bottles)"
          field="water"
          value={items.water}
          presets={QUANTITY_PRESETS.water}
          onChange={(v) => updateItem("water", v)}
        />
        <QuantityInput
          label="🍱 Food (meal packs)"
          field="food"
          value={items.food}
          presets={QUANTITY_PRESETS.food}
          onChange={(v) => updateItem("food", v)}
        />
        <QuantityInput
          label="💊 Medicine (units)"
          field="medicine"
          value={items.medicine}
          presets={QUANTITY_PRESETS.medicine}
          onChange={(v) => updateItem("medicine", v)}
        />
      </div>

      {/* Boolean items */}
      <div className="space-y-1.5">
        <label className="console-label text-[11px] font-medium text-gray-400">Additional Resources</label>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: "medical_team", label: "🏥 Medical Team" },
              { key: "shelter", label: "⛺ Shelter" },
              { key: "transport", label: "🚌 Transport" },
            ] as { key: keyof ResourceItems; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateItem(key, !items[key] as ResourceItems[typeof key])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                items[key]
                  ? "bg-[var(--ink)] border-[var(--ink)] text-white"
                  : "bg-transparent border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <label className="console-label text-[11px] font-medium text-gray-400">Priority</label>
        <div className="flex gap-2">
          {(["LOW", "MODERATE", "CRITICAL"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                priority === p
                  ? p === "CRITICAL"
                    ? "bg-red-400 border-red-400 text-white"
                    : p === "MODERATE"
                    ? "bg-orange-400 border-orange-400 text-white"
                    : "bg-yellow-400 border-yellow-400 text-white"
                  : "bg-transparent border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          id="submit-resource-btn"
          disabled={submitting || !hasAnyItem}
          className="rounded-full bg-[var(--ink)] hover:opacity-85 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-opacity"
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
