"use client";

/**
 * Global keyboard shortcuts for the dashboard.
 * Handles navigation shortcuts only — component-level shortcuts (e.g. Cmd+K)
 * live inside their respective components for access to local refs/state.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only fire when Shift is held (no Ctrl/Cmd — those are reserved for
      // system shortcuts like Cmd+K which dashboard-shell handles).
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      // Skip when user is typing inside an input, textarea, or contentEditable.
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          router.push("/appointments/new");
          break;
        case "p":
          e.preventDefault();
          router.push("/patients/new");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}
