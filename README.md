# NUPRC Digital E-Services Platform

Production-structured MVP scaffold built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **shadcn/ui primitives**, **Prisma**, and **PostgreSQL**.

## Foundation scope delivered (Phase 1)

- Route groups for public/auth, external portal, internal workspace, and admin console
- Polished placeholder dashboard pages with reusable layout shells
- Reusable app components (`AppSidebar`, `AppHeader`, `MetricCard`, `StatusBadge`, `EmptyState`, `PageHeader`, `DataTable shell`)
- Prisma schema covering core entities and enums for the regulatory platform
- Demo seed script with realistic multi-role users, applications, notifications, workflow, payments, and audit events
- Auth.js-compatible credentials auth scaffolding (placeholder login UI + middleware guards)

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

## Seeded demo accounts

All demo users use password: `Demo@123`

- `superadmin@nuprc.demo` (Super Admin)
- `admin@nuprc.demo` (Admin)
- `director@nuprc.demo` (Director)
- `review1@nuprc.demo` (Review Officer)
- `review2@nuprc.demo` (Review Officer)
- `operator@deltaenergy.ng` (External Operator)
- `admin@atlasdw.ng` (Company Admin)
- `operator@nigerbasin.ng` (External Operator)

## What remains for next phase

- Wire login page to real `signIn()` and secure session lifecycle with full Auth.js integration
- Add domain modules for application creation, review workflow actions, and role-aware API handlers
- Implement robust validation and audit-safe mutation flows
- Add file upload pipeline and document storage integration
- Add decision letter/PDF generation pipeline
- Add analytics widgets, SLA timers, and richer filters
- Add automated tests (unit, integration, e2e) and CI checks
