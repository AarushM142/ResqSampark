// lib/deviceId.ts
// Generates and persists a stable per-browser device_id in localStorage.
// Every queued action and every claim/join/leave uses this to identify "who did it."

const STORAGE_KEY = "disaster-portal:device-id";

/**
 * Returns the persistent device_id for this browser, creating one on first call.
 * Safe to call multiple times — always returns the same id after the first call.
 * Must only be called client-side (guards for SSR where `window` is undefined).
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") {
    // Server-side render pass — no stable identity available yet.
    // Callers should only rely on this in client components / effects.
    throw new Error("getDeviceId() called outside the browser (window is undefined)");
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

/** Test/dev helper — clears the stored device id so a fresh one gets generated. */
export function resetDeviceId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
