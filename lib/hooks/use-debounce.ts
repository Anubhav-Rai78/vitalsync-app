"use client";

import { useEffect, useState } from "react";

/**
 * Debounces `value` by `delay` ms. Returns a stale value until the delay
 * has elapsed without a new value arriving.
 *
 * Typical usage for search inputs:
 *
 *   const [query, setQuery] = useState("");
 *   const debouncedQuery = useDebounce(query);
 *   // feed debouncedQuery into a useMemo filter
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}