# NUPRC Digital E-Services Platform

Production-structured MVP scaffold built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **shadcn/ui primitives**, **Prisma**, and **PostgreSQL**.

## Foundation scope delivered (Phase 1)

- Route groups for public/auth, external portal, internal workspace, and admin console
- Polished placeholder dashboard pages with reusable layout shells
- Reusable app components (`AppSidebar`, `AppHeader`, `MetricCard`, `StatusBadge`, `EmptyState`, `PageHeader`, `DataTable shell`)
- Prisma schema covering core entities and enums for the regulatory platform
- Demo seed script with realistic multi-role users, applications, notifications, workflow, payments, and audit events
- Working Auth.js credentials authentication with seeded Prisma users, role-based redirects, and route guards

## Project structure

```txt
.
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   ├── (portal)/portal/{dashboard,services,applications}/page.tsx
│   │   ├── (workspace)/workspace/{dashboard,queue}/page.tsx
│   │   ├── (admin)/admin/{dashboard,users,services,audit}/page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── app/
│   │   ├── layouts/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── types/next-auth.d.ts
├── middleware.ts
└── package.json
```

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env` at repo root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nuprc_eservices?schema=public"
AUTH_SECRET="replace-with-strong-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3) Run Prisma migration and generate client

```bash
npm run db:migrate -- --name init_foundation
npm run db:generate
```

### 4) Seed demo data

```bash
npm run db:seed
```

### 5) Run the app

```bash
npm run dev
```

Open: `http://localhost:3000`

## Demo credentials

- `superadmin@nuprc.demo` / `Demo@123`
- `admin@nuprc.demo` / `Demo@123`
- `director@nuprc.demo` / `Demo@123`
- `review1@nuprc.demo` / `Demo@123`
- `review2@nuprc.demo` / `Demo@123`
- `operator@deltaenergy.ng` / `Demo@123`
- `admin@atlasdw.ng` / `Demo@123`
- `operator@nigerbasin.ng` / `Demo@123`

## Authentication and role mapping

- Login uses Auth.js credentials provider backed by Prisma `User` and bcrypt hash verification.
- Session strategy is JWT, with `roleCode` and `companyId` attached to token/session for route decisions.
- Post-login destination is role-based:
  - `EXTERNAL_OPERATOR`, `COMPANY_ADMIN` → `/portal/dashboard`
  - `REVIEW_OFFICER`, `DIRECTOR` → `/workspace/dashboard`
  - `ADMIN`, `SUPER_ADMIN` → `/admin/dashboard`
- Middleware and route-layout guards enforce area access and redirect users to their own dashboard when they hit unauthorized areas.

## What remains for next phase

- Add domain modules for application creation, review workflow actions, and role-aware API handlers
- Implement robust validation and audit-safe mutation flows
- Add file upload pipeline and document storage integration
- Add decision letter/PDF generation pipeline
- Add analytics widgets, SLA timers, and richer filters
- Add automated tests (unit, integration, e2e) and CI checks
