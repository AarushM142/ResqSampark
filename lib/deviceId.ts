// lib/deviceId.ts
// Generates and persists a stable per-browser device_id in localStorage.
// Every queued action and every claim/join/leave uses this to identify "who did it."

const STORAGE_KEY = "disaster-portal:device-id";

/**
 * Returns the persistent device_id for this browser, creating one on first call.
 * Safe to call multiple times — always returns the same id after the first call.
 * Must only be called client-side (guards for SSR where `window` is undefined).
 */
/** Fallback UUID generator since crypto.randomUUID() throws in non-HTTPS local network dev environments */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        Number(c) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
      ).toString(16)
    );
  }

  // Absolute fallback for environments where crypto is completely undefined
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    // Server-side render pass — no stable identity available yet.
    // Callers should only rely on this in client components / effects.
    throw new Error("getDeviceId() called outside the browser (window is undefined)");
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const fresh = generateUUID();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

/** Test/dev helper — clears the stored device id so a fresh one gets generated. */
export function resetDeviceId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
