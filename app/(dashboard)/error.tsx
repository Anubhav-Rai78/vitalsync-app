"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Route-level error boundary nested inside the dashboard group. Because the
// DashboardShell lives in the parent layout, this fallback renders *inside*
// the shell so navigation/sidebar stay usable while the errored route recovers.
export default function DashboardRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Dashboard Route Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-error-container p-3 text-error">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-on-surface">
        This view hit a snag
      </h2>
      <p className="mt-2 max-w-md text-sm text-on-surface-variant">
        An unexpected error occurred on this page. Your data is safe — try
        again or navigate to another section.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()} variant="primary">
          Try Again
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.location.assign("/dashboard")}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
