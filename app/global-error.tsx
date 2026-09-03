"use client";

import { useEffect } from "react";

// Root-level error boundary. Because this catches failures in the root
// <html>/<body> layout itself, it MUST render its own <html> and <body> tags
// and cannot import components that depend on the root layout (e.g. the UI
// Button). Styles are inline Tailwind utility classes only.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Global Error:", error);
  }, [error]);

  return (
    <html lang="en" className="light">
      <body className="bg-surface text-on-surface antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
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
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-on-surface-variant">
            A critical error prevented this page from loading. Please try to
            recover or return to the dashboard.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-lg bg-primary-container px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.assign("/dashboard")}
              className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-low"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
