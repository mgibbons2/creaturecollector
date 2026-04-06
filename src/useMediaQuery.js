// ── useMediaQuery.js ─────────────────────────────────────────
// Lightweight reactive breakpoint hook.
// Usage: const isMobile = useMediaQuery('(max-width: 600px)');

import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = e => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// Preset breakpoints
export function useIsMobile()  { return useMediaQuery('(max-width: 600px)'); }
export function useIsTablet()  { return useMediaQuery('(max-width: 900px)'); }
export function useIsNarrow()  { return useMediaQuery('(max-width: 480px)'); }
