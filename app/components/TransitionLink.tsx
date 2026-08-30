"use client";
// app/components/TransitionLink.tsx
// Drop-in replacement for next/link's <Link> that plays the curtain page
// transition (see lib/PageTransitionContext.tsx) instead of swapping the
// route instantly. Still renders a real <Link> underneath so prefetching
// keeps working — we just intercept the click.

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { usePageTransition, type TransitionDirection } from "@/lib/PageTransitionContext";

type TransitionLinkProps = ComponentProps<typeof Link> & {
  direction?: TransitionDirection;
};

export function TransitionLink({ direction = "forward", href, onClick, ...rest }: TransitionLinkProps) {
  const navigate = usePageTransition();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Let modified clicks (open in new tab, etc.) behave normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(typeof href === "string" ? href : href.toString(), direction);
  }

  return <Link href={href} onClick={handleClick} {...rest} />;
}
