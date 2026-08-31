// lib/apiOrQueue.ts
// The single chokepoint every mutating UI action should call through, instead of
// calling fetch() or enqueueAction() directly. Handles the "actually offline" and
// the "thinks it's online but isn't" cases the same way, so the rest of the app
// doesn't have to think about connectivity at all — it just gets back a result
// that says whether the change applied immediately or was queued.

import type { ActionType } from "../types";
import { enqueueAction } from "./queue";

export class ApiError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiOrQueueResult<T = unknown> {
  /** "api" = applied immediately via the network. "queued" = stored for later sync. */
  mode: "api" | "queued";
  /** Present when mode === "api". */
  data?: T;
  /** Present when mode === "queued" — useful for optimistic UI / debugging. */
  queuedSeqNumber?: number;
}

export interface ApiOrQueueOptions {
  /** Current offline state, from useConnectivity(). If true, skip the network entirely. */
  isOffline: boolean;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  action_type: ActionType;
  incident_id: string | null;
  payload: object;
  /** Optional timeout in ms before treating the request as failed. Defaults to 8000. */
  timeoutMs?: number;
}

/**
 * Attempts a real API call when online; falls back to queuing the action when
 * offline (per the manual/real connectivity state) OR when the fetch itself fails
 * for any reason (network drop mid-request, timeout, non-2xx response, etc).
 *
 * This is deliberately optimistic: on queue, the caller is expected to apply the
 * change to local UI state itself (this function does not do that — it only
 * decides whether to hit the network or the queue and returns which one happened).
 */
export async function apiOrQueue<T = unknown>(
  options: ApiOrQueueOptions
): Promise<ApiOrQueueResult<T>> {
  const { isOffline, method, url, action_type, incident_id, payload, timeoutMs = 8000 } = options;

  if (isOffline) {
    const queued = enqueueAction(action_type, incident_id, payload);
    return { mode: "queued", queuedSeqNumber: queued.seq_number };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify({ action_type, ...payload }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Both 4xx and 5xx: read the error message and throw immediately.
      // 4xx = client/validation error (e.g. "Already a team member", "Incident not found")
      // 5xx = server error — surfacing it is more useful than silently queuing,
      //       because a queued action will just fail again on replay.
      let errMsg = `Server error ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errMsg = errData.error;
      } catch {}
      throw new ApiError(errMsg);
    }

    const data = (await res.json()) as T;
    return { mode: "api", data };
  } catch (err) {
    // If the error was explicitly thrown by our logic (like 4xx/5xx responses),
    // propagate it so the UI sees the specific failure.
    if (err instanceof ApiError) throw err;

    // Otherwise, assume it's a genuine network failure (DNS, timeout, connection drop),
    // so we queue the action instead.
    const queued = enqueueAction(action_type, incident_id, payload);
    return { mode: "queued", queuedSeqNumber: queued.seq_number };
  }
}
