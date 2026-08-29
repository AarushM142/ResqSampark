// lib/queue.ts
// The actual offline queue. Every write action that happens while offline (or that
// fails mid-flight) gets appended here as a QueuedAction. Nothing in this file talks
// to the network — it only manages localStorage state. lib/sync.ts is what drains it.

import type { ActionType, QueuedAction } from "../types";
import { getDeviceId } from "./deviceId";

const QUEUE_KEY = "disaster-portal:action-queue";
const SEQ_KEY_PREFIX = "disaster-portal:seq:"; // + device_id

function readRaw(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedAction[];
  } catch {
    // Corrupted localStorage entry — don't crash the app, just treat as empty.
    // (Deliberately not clearing it, in case a human wants to inspect it later.)
    console.error("queue.ts: failed to parse stored queue, treating as empty");
    return [];
  }
}

function writeRaw(actions: QueuedAction[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
}

/** Next sequence number for this device, incrementing and persisting as it goes. */
function nextSeqNumber(deviceId: string): number {
  if (typeof window === "undefined") return 0;
  const key = SEQ_KEY_PREFIX + deviceId;
  const current = Number(window.localStorage.getItem(key) ?? "0");
  const next = current + 1;
  window.localStorage.setItem(key, String(next));
  return next;
}

/**
 * Appends a new action to the queue with an incrementing seq_number, current
 * timestamp, and this device's id. Returns the action that was queued.
 */
export function enqueueAction(
  action_type: ActionType,
  incident_id: string | null,
  payload: object
): QueuedAction {
  const device_id = getDeviceId();
  const seq_number = nextSeqNumber(device_id);

  const queued: QueuedAction = {
    device_id,
    seq_number,
    timestamp: Date.now(),
    action_type,
    incident_id,
    payload,
    synced: false,
  };

  const all = readRaw();
  all.push(queued);
  writeRaw(all);

  return queued;
}

/** All actions currently in the queue, synced or not, in insertion order. */
export function getAllQueuedActions(): QueuedAction[] {
  return readRaw();
}

/** Actions still waiting to be synced. This is what the sync bar counter should use. */
export function getPendingActions(): QueuedAction[] {
  return readRaw().filter((a) => !a.synced);
}

export function getPendingCount(): number {
  return getPendingActions().length;
}

/**
 * Marks a specific set of actions as synced, matched by (device_id, seq_number)
 * since that pair is unique per action. Actions not in the batch are left untouched.
 */
export function markActionsSynced(
  synced: Array<{ device_id: string; seq_number: number }>
): void {
  if (synced.length === 0) return;
  const syncedSet = new Set(synced.map((s) => `${s.device_id}:${s.seq_number}`));

  const all = readRaw().map((a) =>
    syncedSet.has(`${a.device_id}:${a.seq_number}`) ? { ...a, synced: true } : a
  );
  writeRaw(all);
}

/**
 * Removes synced actions from storage entirely (call after a successful sync +
 * you no longer need them for display). Keeping this separate from markActionsSynced
 * so the UI can show a brief "✓ synced" state before actions disappear from the list.
 */
export function clearSyncedActions(): void {
  const remaining = readRaw().filter((a) => !a.synced);
  writeRaw(remaining);
}

/** Wipes the entire queue and this device's sequence counter. Dev/reset use only. */
export function resetQueue(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUEUE_KEY);
  // Note: intentionally not clearing per-device seq counters here — resetting seq
  // numbers while old synced actions still reference them would create duplicates
  // if the server ever re-derives ordering from seq_number history.
}
