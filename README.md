# VitalSync

> A modern, enterprise-grade clinic management platform built with Next.js 14 App Router, Supabase, and Razorpay.

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

🌐 **[Live Demo](https://vitalsync-app-delta.vercel.app)** · [Login →](https://vitalsync-app-delta.vercel.app/login)

VitalSync streamlines end-to-end clinical workflows—from patient intake, appointment scheduling, and electronic prescription generation to invoice management and compliant audit logging. Engineered with zero-trust architecture, edge delivery, and type-safe data pipelines.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development Setup](#local-development-setup)
- [Database Migrations & Edge Functions](#database-migrations--edge-functions)
- [Payment Integration (Razorpay)](#payment-integration-razorpay)
- [Code Quality & Testing](#code-quality--testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

### Clinical Operations

- **Patient Management:** Comprehensive patient profiles, medical histories, vitals tracking, and timeline-based record views.
- **Appointment Lifecycle:** Real-time scheduling, dynamic practitioner availability slots, and optimistic status transitions (`Scheduled`, `In-Progress`, `Completed`, `Cancelled`).
- **Digital Prescriptions:** Dynamic medication arrays, dosage specifications, duration instructions, and print-ready formats.

### Administration & Billing

- **Invoicing & Ledger:** Automated invoice generation from clinical consultations with itemized breakdowns and balance reconciliation.
- **Razorpay Integration:** Complete checkout flow supporting UPI, credit/debit cards, net banking, automated webhook verification, and fallback signature validation.
- **Role-Based Access Control (RBAC):** Granular permissions separating Super Admins, Doctors, and Receptionist/Staff personnel.

### Security & System Health

- **Row Level Security (RLS):** Database-level tenant isolation ensuring data access boundaries remain unbreached.
- **Defensive Input Validation:** Unified Zod schema enforcement across all client forms, API handlers, and Next.js Server Actions.
- **Immutable Audit Logging:** System event tracking for critical mutations (status overrides, profile updates, and clinical edits).
- **Automated Health Monitoring:** Edge-driven background monitoring detecting resource constraints and usage limits.

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Hybrid MPA/SPA runtime with React Server Components (RSC) and Server Actions |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety from schema to UI |
| **Database** | PostgreSQL via Supabase | Relational data store with Row Level Security (RLS) |
| **Authentication** | Supabase Auth | Session management, HTTP-only cookies, and middleware-level route protection |
| **Forms & Validation** | React Hook Form + Zod | Controlled, performant inputs with zero unnecessary re-renders |
| **Payments** | Razorpay SDK | Order creation, payment processing, and cryptographically verified webhooks |
| **UI & Styling** | Tailwind CSS + Lucide Icons | Custom design system utilizing tokenized UI primitives |
| **Edge Compute** | Supabase Edge Functions | Deno-based asynchronous workers and health checks |

---

## Repository Structure

```text
├── app/
│   ├── (auth)/                  # Public auth routes (login, register, reset-password)
│   ├── (dashboard)/             # Protected application routes (wrapped in DashboardShell)
│   │   ├── appointments/        # Appointment scheduling & queue views
│   │   ├── doctors/             # Practitioner rosters & availability
│   │   ├── invoices/            # Financial reporting & invoice generation
│   │   ├── patients/            # Patient directories & clinical histories
│   │   ├── prescriptions/       # Prescription authoring tool
│   │   ├── settings/            # Clinic details, staff management & scaling controls
│   │   └── layout.tsx           # Persistent shell & navigation layout
│   └── api/                     # Edge & Node API endpoints (Razorpay hooks, orders)
├── components/
│   ├── modules/                 # Composite feature components (modals, tables, forms)
│   └── ui/                      # Base primitive components (Button, Input, Card, Badge)
├── lib/
│   ├── hooks/                   # Reusable React hooks (useDebounce, useOptimistic, etc.)
│   ├── supabase/                # Browser, server, and administrative client factories
│   └── validators/              # SSOT Zod schemas for forms and API contracts
├── supabase/
│   ├── functions/               # Deno edge runtime functions (usage-monitor)
│   └── migrations/              # Incremental SQL migration scripts and RLS policies
├── middleware.ts                 # Session verification & RBAC gateway
└── tailwind.config.ts           # Design tokens, color palettes, and typographic scales
```

---

## Prerequisites

Before running the project locally, ensure you have:

- **Node.js:** v18.17.0 or later (LTS recommended)
- **Package Manager:** npm (v9+) or pnpm (v8+)
- **Supabase CLI:** installed globally (`npm install -g supabase`)
- **Git:** version control

---

## Environment Configuration

Create a `.env.local` file by copying the sample template:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Razorpay Payment Gateway (Test Mode)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_yourKeyId
RAZORPAY_KEY_SECRET=yourKeySecret
RAZORPAY_WEBHOOK_SECRET=yourWebhookSecret
```

---

## Local Development Setup

**1. Clone the repository:**

```bash
git clone https://github.com/Anubhav-Rai78/vitalsync-app.git
cd vitalsync-app
```

**2. Install project dependencies:**

```bash
npm install
```

**3. Link your Supabase project & apply migrations:**

```bash
supabase login
supabase link --project-ref <your-supabase-project-id>
supabase db push
```

**4. Generate fresh database types (optional but recommended):**

```bash
supabase gen types typescript --linked > lib/supabase/types.ts
```

**5. Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Register your initial user profile at `/register` to claim the default Clinic Administrator account.

---

## Database Migrations & Edge Functions

All structural schema changes, indexes, triggers, and RLS policies live in `supabase/migrations/`.

**Push local schema to remote instance:**

```bash
supabase db push
```

**Deploy background Edge Functions:**

```bash
supabase functions deploy usage-monitor
```

**Schedule Cron Jobs:**

```bash
supabase functions schedule usage-monitor --cron "0 3 * * *"
```

---

## Payment Integration (Razorpay)

VitalSync uses standard server-side order negotiation:

1. **Order Creation:** Client requests an order via Server Action; server creates an order on Razorpay with an idempotent UUID.
2. **Checkout Modal:** The client opens the Razorpay modal using the returned `order_id`.
3. **Verification:** The client submits `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to `/api/razorpay/verify`. The signature is validated with SHA-256 HMAC encryption before the invoice status updates to `PAID`.
4. **Webhook Fallback:** Configure webhook events for `payment.captured` and `payment.failed` in the Razorpay Dashboard targeting:

```
https://vitalsync-app-delta.vercel.app/api/webhooks/razorpay
```

---

## Code Quality & Testing

To maintain production standards, execute verification scripts locally before opening pull requests:

```bash
# Verify static typing
npm run typecheck

# Lint source files
npm run lint

# Execute production build compilation
npm run build
```

---

## Deployment

### Vercel (Recommended)

1. Push your repository to GitHub/GitLab.
2. Import the project into your [Vercel team dashboard](https://vercel.com/dashboard).
3. Configure the environment variables defined in `.env.example`.
4. Deploy. Subsequent pushes to `main` will trigger automated production preview builds.

**Production URL:** [https://vitalsync-app-delta.vercel.app](https://vitalsync-app-delta.vercel.app)

---

## Roadmap

- [ ] **Interactive Calendar Interface:** Transition the appointment queue into full week/month interactive grid views.
- [ ] **Transactional Notification Service:** Integrate Resend/Postmark into the notification edge worker for automated SMS/Email reminders.
- [ ] **Media Bucket Wiring:** Connect doctor avatars and clinic branding logos to dedicated Supabase Storage buckets.
- [ ] **Deno Local Typings:** Add localized workspace typings inside `supabase/functions/` for enhanced developer experience.

---

## Contributing

Contributions are welcome. Please adhere to the following workflow:

1. Fork the repository.
2. Create a standardized feature branch:
   ```bash
   git checkout -b feat/prescription-auto-suggest
   ```
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(prescriptions): add drug interaction auto-check"
   ```
4. Confirm `npm run typecheck` and `npm run build` pass with zero warnings/errors.
5. Submit a detailed Pull Request.

---

