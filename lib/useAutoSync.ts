// lib/useAutoSync.ts
// Runs runSync() automatically every 30s while the app considers itself online,
// per Phase 4/5 of the spec. Also exposes a manual trigger for the [SYNC NOW] button
// so both paths share one implementation and one in-flight guard.

import { useEffect, useRef, useState, useCallback } from "react";
import { runSync, type SyncRunResult } from "./sync";
import { getPendingCount } from "./queue";

const AUTO_SYNC_INTERVAL_MS = 30_000;

export interface AutoSyncState {
  isSyncing: boolean;
  lastResult: SyncRunResult | null;
  pendingCount: number;
  /** Manually trigger a sync now (used by the [SYNC NOW] button). */
  syncNow: () => Promise<SyncRunResult | null>;
}

/**
 * @param isOffline current connectivity state (manual toggle OR real detection).
 *   Auto-resync only runs while this is false. Passing true pauses the timer
 *   entirely rather than attempting and failing every 30s.
 */
export function useAutoSync(isOffline: boolean): AutoSyncState {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncRunResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const inFlight = useRef(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPendingCount());
  }, []);

  const syncNow = useCallback(async (): Promise<SyncRunResult | null> => {
    if (inFlight.current) return null; // guard against overlapping syncs
    inFlight.current = true;
    setIsSyncing(true);
    try {
      const result = await runSync();
      setLastResult(result);
      refreshPendingCount();
      return result;
    } finally {
      inFlight.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // Keep the pending counter live even between syncs (e.g. right after a new
  // action gets queued while offline) by polling localStorage cheaply.
  useEffect(() => {
    refreshPendingCount();
    const poll = setInterval(refreshPendingCount, 2000);
    return () => clearInterval(poll);
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOffline) return; // don't attempt network calls while offline

    const timer = setInterval(() => {
      syncNow();
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOffline, syncNow]);

  return { isSyncing, lastResult, pendingCount, syncNow };
}
