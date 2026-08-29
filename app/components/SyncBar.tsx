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
    <div className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Connectivity indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isOffline ? "bg-red-500" : "bg-green-500"
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              isOffline ? "text-red-400" : "text-green-400"
            }`}
          >
            {isOffline ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        {/* Pending actions badge */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/60 border border-amber-700 text-amber-300 text-xs px-2 py-0.5 font-medium">
            ⏳ {pendingCount} action{pendingCount !== 1 ? "s" : ""} waiting to sync
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Offline mode toggle */}
          <button
            id="offline-toggle-btn"
            onClick={toggleManualOffline}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
              manualOffline
                ? "bg-red-900/60 border-red-700 text-red-300 hover:bg-red-900"
                : "bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            }`}
          >
            {manualOffline ? "🔴 OFFLINE MODE ON" : "Toggle Offline"}
          </button>

          {/* Sync now button */}
          {!isOffline && (
            <button
              id="sync-now-btn"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="text-xs px-2.5 py-1 rounded border border-blue-700 bg-blue-900/40 text-blue-300 hover:bg-blue-900/70 disabled:opacity-50 font-medium transition-colors"
            >
              {isSyncing ? "Syncing…" : "⟳ Sync Now"}
            </button>
          )}
        </div>
      </div>

      {/* Sync results checklist */}
      {showResults && lastResult && !lastResult.requestFailed && lastResult.attempted > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Last sync: {lastResult.succeeded} applied, {lastResult.failed} pending
            </p>
            <button
              onClick={() => setShowResults(false)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {lastResult.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    r.status === "applied"
                      ? "text-green-400"
                      : r.status === "rejected"
                      ? "text-amber-400"
                      : "text-red-400"
                  }
                >
                  {r.status === "applied" ? "✓" : r.status === "rejected" ? "⚠" : "✕"}
                </span>
                <span className="text-gray-400">{r.message}</span>
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
