import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <span className="text-6xl font-extrabold text-outline">404</span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-on-surface">
        Resource not found
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        The requested record or endpoint does not exist or has been archived.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-primary-container px-4 py-2.5 text-sm font-medium text-on-primary shadow transition hover:bg-primary"
      >
        Go back to Safety
      </Link>
    </div>
  );
}
