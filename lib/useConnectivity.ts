// lib/useConnectivity.ts
// Combines real network detection with the manual OFFLINE MODE toggle from the spec.
//
// isOffline = manualOffline || !browserOnline
//
// Why both: navigator.onLine / the browser's online-offline events catch a genuine
// wifi drop automatically, which is the "actual offline queue" behavior. But
// navigator.onLine is notoriously unreliable — it only reflects "does the OS think
// it has a network interface," not "can I actually reach the server." A laptop
// connected to wifi with no upstream internet still reports online: true. So the
// manual toggle stays as a reliable override for the live demo, and apiOrQueue.ts
// (not this file) adds a second safety net: it falls back to the queue on an
// actual failed fetch too, regardless of what this hook reports.

import { useEffect, useState, useCallback } from "react";

const MANUAL_OVERRIDE_KEY = "disaster-portal:manual-offline";

export interface ConnectivityState {
  /** True if EITHER the manual toggle is on OR the browser reports no network. */
  isOffline: boolean;
  /** Raw navigator.onLine-derived state, exposed for debugging/UI display. */
  browserOnline: boolean;
  /** Raw manual toggle state. */
  manualOffline: boolean;
  /** Flips the manual toggle. */
  toggleManualOffline: () => void;
  /** Explicitly set the manual toggle. */
  setManualOffline: (value: boolean) => void;
}

export function useConnectivity(): ConnectivityState {
  const [browserOnline, setBrowserOnline] = useState<boolean>(true);
  const [manualOffline, setManualOfflineState] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStatus = () => {
      if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
        setBrowserOnline(navigator.onLine);
      }
    };

    updateStatus();
    setManualOfflineState(localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true");

    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    // Sync manualOffline across all hook instances in the same tab.
    // When SyncBar's instance writes to localStorage, the page's instance
    // picks it up here instead of staying stale on its initial mount value.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === MANUAL_OVERRIDE_KEY) {
        setManualOfflineState(e.newValue === "true");
      }
    };
    // Same-tab sync: the native 'storage' event only fires in OTHER tabs.
    // This custom event is dispatched by setManualOffline() in this same file.
    const handleManualOfflineChange = (e: Event) => {
      setManualOfflineState((e as CustomEvent<boolean>).detail);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("manualOfflineChange", handleManualOfflineChange);

    const poll = setInterval(updateStatus, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("manualOfflineChange", handleManualOfflineChange);
      clearInterval(poll);
    };
  }, []);

  const setManualOffline = useCallback((value: boolean) => {
    setManualOfflineState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MANUAL_OVERRIDE_KEY, String(value));
      // Dispatch a custom event so same-tab instances of this hook update immediately.
      // The native 'storage' event only fires in OTHER tabs, not the one that wrote it.
      window.dispatchEvent(new CustomEvent("manualOfflineChange", { detail: value }));
    }
  }, []);

  const toggleManualOffline = useCallback(() => {
    setManualOffline(!manualOffline);
  }, [manualOffline, setManualOffline]);

  return {
    isOffline: manualOffline || !browserOnline,
    browserOnline,
    manualOffline,
    toggleManualOffline,
    setManualOffline,
  };
}
