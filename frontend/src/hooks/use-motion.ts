'use client';

import { useEffect, useState, type RefObject } from 'react';

/** False on the server and first client render, true after mount. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * True once `ref` first scrolls into view, then stays true (fires once).
 * Falls back to true when IntersectionObserver is unavailable so content is
 * never left hidden.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = '0px 0px -10% 0px', threshold = 0.2 }: { rootMargin?: string; threshold?: number } = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}
