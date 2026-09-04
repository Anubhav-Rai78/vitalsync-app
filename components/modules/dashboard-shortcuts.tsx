"use client";

import { useGlobalShortcuts } from "@/lib/hooks/use-global-shortcuts";

/**
 * Thin client wrapper that activates global keyboard shortcuts.
 * Mounted inside the server-rendered dashboard layout.
 */
export function DashboardShortcuts() {
  useGlobalShortcuts();
  return null;
}
