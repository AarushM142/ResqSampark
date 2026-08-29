// lib/sync.ts
// Drains the pending queue by POSTing to /api/sync and only marks actions as
// synced once the server actually confirms each one individually — a batch that
// partially fails should partially clear, not all-or-nothing.

import type { QueuedAction } from "../types";
import { getPendingActions, markActionsSynced, clearSyncedActions } from "./queue";

/** Per-action result the server is expected to return for each item in the batch. */
export interface SyncActionResult {
  device_id: string;
  seq_number: number;
  status: "applied" | "rejected" | "error";
  /** Human-readable line for the sync results checklist, e.g. "⚠ Claim conflict resolved" */
  message: string;
}

export interface SyncResponse {
  results: SyncActionResult[];
}

export interface SyncRunResult {
  attempted: number;
  succeeded: number;
  failed: number;
  results: SyncActionResult[];
  /** True if the request itself never reached the server (network error). */
  requestFailed: boolean;
}

/**
 * Sends all pending queued actions to /api/sync. Marks each action synced based on
 * the server's per-action result — "applied" and "rejected" both count as
 * successfully synced (the server processed it and made a decision), only
 * "error" leaves an action unsynced so the next auto-resync retries it.
 */
export async function runSync(): Promise<SyncRunResult> {
  const pending = getPendingActions();

  if (pending.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, results: [], requestFailed: false };
  }

  let response: SyncResponse;
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: pending }),
    });

    if (!res.ok) {
      // Whole request failed at the HTTP level — nothing synced, everything stays queued.
      return {
        attempted: pending.length,
        succeeded: 0,
        failed: pending.length,
        results: [],
        requestFailed: true,
      };
    }

    response = (await res.json()) as SyncResponse;
  } catch {
    // Network dropped mid-sync, or /api/sync unreachable. Leave the queue untouched —
    // the 30s auto-resync (useAutoSync.ts) will retry the same pending actions later.
    return {
      attempted: pending.length,
      succeeded: 0,
      failed: pending.length,
      results: [],
      requestFailed: true,
    };
  }

  const resultsByKey = new Map(
    response.results.map((r) => [`${r.device_id}:${r.seq_number}`, r])
  );

  const confirmedSynced: Array<{ device_id: string; seq_number: number }> = [];
  const stillPending: SyncActionResult[] = [];

  for (const action of pending) {
    const key = `${action.device_id}:${action.seq_number}`;
    const result = resultsByKey.get(key);

    if (!result) {
      // Server didn't return a result for this action at all — treat as unsynced,
      // don't silently assume success.
      continue;
    }

    if (result.status === "applied" || result.status === "rejected") {
      confirmedSynced.push({ device_id: action.device_id, seq_number: action.seq_number });
    }
    // status === "error" -> leave it in the queue, unsynced, for the next retry.
  }

  markActionsSynced(confirmedSynced);
  clearSyncedActions();

  const succeeded = confirmedSynced.length;
  const failed = pending.length - succeeded;

  return {
    attempted: pending.length,
    succeeded,
    failed,
    results: response.results,
    requestFailed: false,
  };
}
