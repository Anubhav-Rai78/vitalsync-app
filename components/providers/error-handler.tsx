"use client";

import { useEffect } from "react";
import { registerChunkLoadRecovery } from "@/lib/api/client";

/**
 * Mount once at the root to install global client-side resilience:
 *   • unhandledrejection auto-recovery for 'Loading chunk … failed' errors
 *   • a safety-net window error listener for non-React runtime exceptions
 *
 * It renders its children unchanged — this component only adds event listeners.
 */
export function ErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Auto-reload when a deployment invalidates a hashed JS chunk.
    registerChunkLoadRecovery();

    const onError = (event: ErrorEvent) => {
      console.error("Uncaught runtime error:", event.error ?? event.message);
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  return <>{children}</>;
}
