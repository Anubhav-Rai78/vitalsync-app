"use client";

import { useEffect, useState } from "react";

/**
 * `useHydrated` returns `false` during the initial server render and the
 * first client render, then flips to `true` once the component has mounted in
 * the browser.
 *
 * Use it to guard any DOM-dependent render path that would otherwise produce
 * a hydration mismatch — e.g. reading localStorage, generating time-based
 * text, or rendering `new Date()` output during SSR. Only render the
 * browser-specific branch after `hydrated === true`.
 *
 *   const hydrated = useHydrated();
 *   return <>{hydrated ? <TimeLabel date={now} /> : <Skeleton />}</>;
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

/** Alias — `useMounted` reads identically and is a common naming convention. */
export { useHydrated as useMounted };
