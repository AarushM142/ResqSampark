"use client";
// app/components/SyncBar.tsx
// Persistent sync status bar shown in the layout.
// Displays: 🔴/🟢 connectivity, "N actions waiting" badge, [OFFLINE MODE] toggle, [SYNC NOW] button.
// Sync results checklist shown after each sync attempt.
// Driven by useConnectivity() and useAutoSync() from the provided lib files.

import { useState, useEffect } from "react";
import { useConnectivity } from "@/lib/useConnectivity";
import { useAutoSync } from "@/lib/useAutoSync";
import type { SyncRunResult } from "@/lib/sync";

export function SyncBar() {
  const { isOffline, manualOffline, toggleManualOffline } = useConnectivity();
  const { isSyncing, lastResult, pendingCount, syncNow } = useAutoSync(isOffline);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    }
  }, []);

  async function handleSyncNow() {
    setShowResults(true);
    await syncNow();
  }

  return (
    <div className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Connectivity indicator */}
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 shadow-2xs ${isOffline ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"}`}>
          <span className={`relative inline-flex w-2 h-2 ${isOffline ? "text-rose-600" : "text-emerald-600"}`}>
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isOffline ? "bg-rose-600" : "bg-emerald-600"
              }`}
            />
            {!isOffline && <span className="radar-ping" />}
          </span>
          <span
            className={`text-xs font-bold ${
              isOffline ? "text-rose-700" : "text-emerald-800"
            }`}
          >
            {isOffline ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        {/* Pending actions badge */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs px-2.5 py-1 font-bold text-amber-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-alarm-blink" />
            <span>{pendingCount} action{pendingCount !== 1 ? "s" : ""} queued</span>
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Offline mode toggle */}
          <button
            id="offline-toggle-btn"
            onClick={toggleManualOffline}
            className={`text-xs px-3 py-1.5 rounded-full border font-bold transition-all cursor-pointer shadow-2xs ${
              manualOffline
                ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                : "bg-white border-zinc-300 text-zinc-800 hover:border-zinc-500 hover:text-zinc-950"
            }`}
          >
            {manualOffline ? "● Offline Mode On" : "Toggle Offline"}
          </button>

          {/* Sync now button */}
          {!isOffline && (
            <button
              id="sync-now-btn"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="text-xs px-3.5 py-1.5 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 active:scale-95 text-zinc-950 disabled:opacity-50 font-bold transition-all cursor-pointer disabled:cursor-default shadow-2xs"
            >
              <span className={isSyncing ? "inline-block animate-spin" : "inline-block"}>⟳</span>{" "}
              {isSyncing ? "Syncing…" : "Sync Now"}
            </button>
          )}
        </div>
      </div>

      {/* Sync results checklist */}
      {showResults && lastResult && !lastResult.requestFailed && lastResult.attempted > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-2.5 space-y-1.5 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Last sync:{" "}
              <span className="text-gray-300 font-medium">{lastResult.succeeded} applied</span>,{" "}
              {lastResult.failed} pending
            </p>
            <button
              onClick={() => setShowResults(false)}
              className="text-xs text-gray-600 hover:text-gray-300 transition-colors cursor-pointer rounded-full w-5 h-5 flex items-center justify-center hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-2 font-mono text-[11px]">
            {lastResult.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={
                    r.status === "applied"
                      ? "text-green-400"
                      : r.status === "rejected"
                      ? "text-gray-500"
                      : "text-red-400"
                  }
                >
                  {r.status === "applied" ? "[OK]" : r.status === "rejected" ? "[~~]" : "[XX]"}
                </span>
                <span className={r.status === "rejected" ? "text-gray-500" : "text-gray-400"}>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showResults && lastResult?.requestFailed && (
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <p className="text-xs text-red-400">
            Sync failed — network unreachable. Will retry automatically.
          </p>
        </div>
      )}
    </div>
  );
}
