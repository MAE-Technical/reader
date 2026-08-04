"use client";

import { useEffect, useState } from "react";

/**
 * True once the element attached via the returned `setNode` ref callback
 * has scrolled entirely above the viewport (its bottom edge has gone
 * negative) — false both before the reader reaches it and while it's still
 * on screen. Built for "shrink the hero into a compact, fixed bar once
 * you've scrolled past it" — a plain `isIntersecting` check can't tell that
 * apart from "hasn't been reached yet," since both report as
 * not-intersecting.
 *
 * Takes a ref *callback* (`setNode`, meant for `<div ref={setNode}>`)
 * rather than a `useRef` object on purpose: callers whose tracked element
 * only mounts conditionally (e.g. gated behind a store's hydration flag)
 * would otherwise never observe it — a plain `useRef` object keeps the same
 * identity across renders even after `.current` flips from null to a real
 * node, so an effect keyed on that ref object never re-runs to pick up the
 * newly-attached element. Holding the node in state instead (as React's own
 * docs recommend for this exact case) means the effect's dependency
 * genuinely changes the moment the element attaches.
 */
export function useScrolledPast<T extends Element>() {
  const [node, setNode] = useState<T | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPast(entry.boundingClientRect.bottom < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { setNode, node, past };
}
