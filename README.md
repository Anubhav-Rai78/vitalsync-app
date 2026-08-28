# VitalSync

Clinic management system. Next.js 14 (App Router) + Supabase (Postgres, Auth, Edge Functions) + Razorpay + Vercel.

This codebase was written end-to-end and **verified with a real `npm install`, `tsc --noEmit`, and `next build`** —
not just hand-written and hoped-for. All 24 routes compile and the production build succeeds. It has **not** been
run against a live Supabase project yet (that needs your real project keys — see Setup below), so runtime behavior
against actual data hasn't been exercised end-to-end.

## What's real vs. what needs finishing

**Fully wired to the database** (Server Actions + real Supabase queries, not mock data):
Auth (login/register), Dashboard, Patients (list/detail/add), Doctors (list/detail), Appointments
(list/detail/booking/status transitions), Prescriptions (list/detail/create), Invoices (list/detail),
Razorpay payment (order creation → checkout → signature verification → webhook fallback), Settings
(clinic details, staff list, the Scaling Mode toggle), Audit Log, System Health, Profile.

**Left for Antigravity / you to finish** — flagged in-code with comments where relevant:
- **Staff role editing.** The Settings → Staff tab lists staff but the "promote to doctor/admin" control
  isn't built — extend the table with an inline `<select>` bound to a small Server Action, same pattern as
  `updateScalingModeAction` in `app/(dashboard)/settings/actions.ts`.
- **Email/SMS notifications.** The `notifications` table and the usage-monitor alert logic exist, but nothing
  sends an actual email yet — wire a provider (Resend, Postmark, etc.) into
  `supabase/functions/usage-monitor/index.ts`.
- **Deno types for the Edge Function.** `supabase/functions/usage-monitor/index.ts` is excluded from the root
  `tsconfig.json` because it runs on Supabase's Deno runtime, not Node — that's expected, not a bug. If you want
  editor type-checking for it, add a separate `supabase/functions/tsconfig.json` with Deno's types, or use the
  Deno VS Code extension scoped to that folder.
- **Real appointment calendar view.** `/appointments` is currently a sortable table (accurate, simple, fast to
  ship) rather than the full month/week calendar grid implied by the original design file — upgrading to a true
  calendar is a good next iteration once the core flow is confirmed working.
- **File uploads** (doctor avatars, clinic logo) aren't wired to Supabase Storage yet — the UI reads `avatar_url`
  /`logo_url` columns but nothing populates them.

## Setup

You only need to do the steps marked 🔴 — everything else Antigravity (or you, via the CLI) can run.

1. 🔴 Create a Supabase project at supabase.com (free tier). Copy the Project URL, `anon` key, and
   `service_role` key.
2. 🔴 Create a Razorpay account at razorpay.com, stay in **Test Mode**, copy the test Key ID and Key Secret.
3. Copy `.env.example` to `.env.local` and fill in the values from steps 1–2.
4. Install the Supabase CLI, then link and push the schema:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push          # runs supabase/migrations/*.sql
   ```
5. (Optional but recommended) Regenerate the TypeScript types from your real, live schema — the hand-written
   copy in `lib/supabase/types.ts` is accurate to the migration but the CLI-generated one will be authoritative:
   ```bash
   supabase gen types typescript --linked > lib/supabase/types.ts
   ```
6. Install dependencies and run locally:
   ```bash
   npm install
   npm run dev
   ```
7. Register your first account at `/register` — the first person to register becomes the clinic admin and
   names the clinic (see `app/(auth)/register/actions.ts`).
8. 🔴 Deploy: push this repo to GitHub, import it in Vercel, add the same env vars from `.env.local` in the
   Vercel project settings, deploy.
9. 🔴 In the Razorpay dashboard, add a webhook pointing at
   `https://<your-domain>/api/webhooks/razorpay` for the `payment.captured` and `payment.failed` events, using
   the same secret as `RAZORPAY_WEBHOOK_SECRET`.
10. (Optional) Deploy and schedule the usage-monitor Edge Function:
    ```bash
    supabase functions deploy usage-monitor
    supabase functions schedule usage-monitor --cron "0 3 * * *"
    ```

## Project structure

```
app/(auth)/          — login, register (public)
app/(dashboard)/     — everything behind auth, wrapped in the shared shell (components/modules/dashboard-shell.tsx)
app/api/              — Razorpay order-creation, verification, and webhook routes
components/ui/        — design-token-driven primitives (Button, Input, Card, Badge, Skeleton)
components/modules/   — feature components (forms, the dashboard shell, the pay button, etc.)
lib/supabase/          — browser/server/admin Supabase clients + hand-maintained DB types
supabase/migrations/   — full schema, RLS policies, the audit-log trigger
supabase/functions/     — the usage-monitor Edge Function backing the Scaling Mode toggle
middleware.ts           — session refresh + role-based route protection
```

## Design system

`tailwind.config.ts` and `app/globals.css` contain the exact color/type/spacing tokens extracted from the
original Stitch export's `clinical_precision/DESIGN.md` — not reinterpreted. All 21 original screens were
machine-converted from the export's HTML into JSX (see the conversion approach described in the project's
build plan) so the visual output matches the source design, not a redesign.

## A note on the "auto-scale to paid tier" feature

Settings → Scaling & Billing implements this honestly: no vendor (Vercel, Supabase) exposes a public API that
silently upgrades a billing plan with zero human touch. What's actually built is usage monitoring, graceful
free-tier degradation, and one-click upgrade alerts — see the comments in
`app/(dashboard)/settings/actions.ts` and `supabase/functions/usage-monitor/index.ts` for the full reasoning.
