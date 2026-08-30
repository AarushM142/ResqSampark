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
    <div className="border-b border-gray-800 bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
        {/* Connectivity indicator */}
        <div className="flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 pl-2.5 pr-3 py-1">
          <span className={`relative inline-flex w-2 h-2 ${isOffline ? "text-red-500" : "text-green-500"}`}>
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isOffline ? "bg-red-500" : "bg-green-500"
              }`}
            />
            {!isOffline && <span className="radar-ping" />}
          </span>
          <span
            className={`text-xs font-medium ${
              isOffline ? "text-red-400" : "text-green-400"
            }`}
          >
            {isOffline ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        {/* Pending actions badge */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900 border border-amber-700 text-xs px-2.5 py-1 font-medium" style={{ color: "var(--amber-text)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-alarm-blink" />
            <span>{pendingCount} action{pendingCount !== 1 ? "s" : ""} queued</span>
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Offline mode toggle */}
          <button
            id="offline-toggle-btn"
            onClick={toggleManualOffline}
            className={`text-[13px] px-3 py-1.5 rounded-full border font-medium transition-all cursor-pointer ${
              manualOffline
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-transparent border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
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
              className="text-[13px] px-3 py-1.5 rounded-full border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white disabled:opacity-50 font-medium transition-all cursor-pointer disabled:cursor-default"
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
                      ? "text-amber-400"
                      : "text-red-400"
                  }
                >
                  {r.status === "applied" ? "[OK]" : r.status === "rejected" ? "[!!]" : "[XX]"}
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
