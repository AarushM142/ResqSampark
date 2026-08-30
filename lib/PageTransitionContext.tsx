"use client";
// lib/PageTransitionContext.tsx
// Hand-rolled "curtain" page transition: a full-screen panel sweeps in from
// one edge to fully cover the viewport, the route swap happens invisibly
// underneath, then the panel continues in the same direction off the far
// edge, revealing the new page. One continuous sweep — like a camera
// panning from where you were to where you're going — rather than a
// fade/pop. This is the same technique behind most award-winning "page
// transition" sites; it doesn't rely on browser View Transition support,
// so timing and easing are fully in our control.
//
// The cover→reveal handoff is driven by two real signals instead of guessed
// timers: `animationend` for when the cover sweep itself finishes, and
// `usePathname()` for when Next.js has actually finished navigating (which
// can take longer than a fixed delay if the destination route needs
// on-demand compilation or a data fetch) — revealing before the new route
// has truly mounted is what made the curtain look like it "did nothing."

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AnimationEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

export type TransitionDirection = "forward" | "back";

type NavigateFn = (href: string, direction?: TransitionDirection) => void;

const PageTransitionContext = createContext<NavigateFn>(() => {});

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

// Safety net only — if the destination never shows up (failed nav, etc.),
// don't leave the app permanently covered.
const STUCK_GUARD_MS = 6000;

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const pendingPathRef = useRef<string | null>(null);
  const coveredRef = useRef(false); // true once the cover sweep has fully finished
  const guardRef = useRef<number | undefined>(undefined);
  const reducedMotionRef = useRef(false);

  const [phase, setPhase] = useState<"idle" | "covering" | "revealing">("idle");
  const [direction, setDirection] = useState<TransitionDirection>("forward");

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const reset = useCallback(() => {
    if (guardRef.current) window.clearTimeout(guardRef.current);
    setPhase("idle");
    busyRef.current = false;
    pendingPathRef.current = null;
    coveredRef.current = false;
  }, []);

  const navigate = useCallback<NavigateFn>(
    (href, dir = "forward") => {
      if (busyRef.current) return;

      // Respect reduced-motion: navigate immediately, no animated curtain.
      if (reducedMotionRef.current) {
        router.push(href);
        return;
      }

      busyRef.current = true;
      coveredRef.current = false;
      // Strip query/hash — usePathname() only ever reports the path itself.
      pendingPathRef.current = href.split("?")[0].split("#")[0];

      const el = overlayRef.current;
      if (el) {
        // Park the panel just off the entry edge, then force a reflow so the
        // upcoming class change animates from exactly here instead of
        // jump-cutting to the keyframe's "from" value.
        el.style.transform = dir === "forward" ? "translate3d(100%,0,0)" : "translate3d(-100%,0,0)";
        void el.offsetHeight;
      }

      setDirection(dir);
      setPhase("covering");

      guardRef.current = window.setTimeout(reset, STUCK_GUARD_MS);
    },
    [router, reset]
  );

  // Fires when the cover sweep's own CSS animation completes. Kick off the
  // real navigation, but don't reveal yet — wait for pathname to confirm
  // the destination has actually mounted (see the effect below).
  const handleAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      if (e.target !== overlayRef.current) return; // ignore the wordmark's own animation bubbling up

      if (phase === "covering") {
        coveredRef.current = true;
        if (pendingPathRef.current) router.push(pendingPathRef.current);
        // Already on the target route (e.g. re-navigating to the same
        // path) — pathname won't change, so reveal on the next frame.
        if (pathname === pendingPathRef.current) {
          requestAnimationFrame(() => setPhase("revealing"));
        }
      } else if (phase === "revealing") {
        reset();
      }
    },
    [phase, pathname, router, reset]
  );

  // The real "destination is ready" signal: the rendered path now matches
  // what we navigated to. Only meaningful once the cover sweep has finished.
  useEffect(() => {
    if (coveredRef.current && pendingPathRef.current && pathname === pendingPathRef.current) {
      setPhase("revealing");
    }
  }, [pathname]);

  return (
    <PageTransitionContext.Provider value={navigate}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className={`pt-overlay pt-${direction} pt-${phase}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="pt-shape pt-shape--blob" />
        <div className="pt-shape pt-shape--ring" />
        <div className="pt-shape pt-shape--dot" />
        <span className="pt-overlay-mark">ResQSampark</span>
      </div>
    </PageTransitionContext.Provider>
  );
}
