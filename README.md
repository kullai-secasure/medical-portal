# MedPortal

A patient portal built with Next.js 14 (App Router), Prisma + PostgreSQL, shadcn/ui, and Tailwind CSS. Full RBAC across five roles, plus referrals, prescription refills, gated lab results, recurring appointments/waitlists, medical record sharing, audit logging, bulk import, and global search.

## Stack

- **Next.js 14** (App Router, Server Actions, Middleware)
- **NextAuth.js** (credentials provider, JWT sessions, role-based route protection)
- **Prisma ORM** + **PostgreSQL**
- **shadcn/ui** (Radix primitives) + **Tailwind CSS**
- TypeScript throughout

## Getting Started

1. Make sure PostgreSQL is running and `DATABASE_URL` in `.env` points to it. Locally this project uses:

   ```bash
   brew services start postgresql@17
   createdb medportal
   ```

2. Set required env vars in `.env` (see `.env` for the current values):

   ```
   DATABASE_URL="postgresql://.../medportal"
   NEXTAUTH_SECRET="<random string>"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Install dependencies, push the schema, and seed:

   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — it redirects to sign-in.

## Demo accounts

All seeded with password `password123`:

| Role | Email |
|---|---|
| Patient | patient@example.com |
| Doctor | doctor@example.com |
| Doctor (2nd, for referrals) | doctor2@example.com |
| Nurse | nurse@example.com |
| Lab Technician | labtech@example.com |
| Admin | admin@example.com |

## Roles & permissions

- **Patient** — view own records, book/cancel/reschedule appointments, join waitlists, request prescription refills, view released lab results, generate temporary share links.
- **Doctor** — view patient list (including active referrals), refer patients to specialists, prescribe medications and approve/deny refills, review and release lab results, block schedule time.
- **Nurse** — view department appointments and recent vitals.
- **Lab Technician** — view pending lab orders, upload results (with optional PDF/image attachment).
- **Admin** — global search, audit log, CSV bulk import of patient accounts.

Routes are protected by `src/middleware.ts`, which maps each `Role` to its allowed URL prefixes.

## Feature notes

- **Referrals** (`Referral` model) — a doctor refers a patient to a specialist; once accepted, the specialist gets access to that patient's record via `getDoctorPatients()`.
- **Refill workflow** (`RefillRequest` model) — patient requests, doctor approves (decrements `refillsRemaining`) or denies with a reason; patient is notified either way.
- **Lab results** — lab techs upload results (stored under `public/uploads/lab-results/`); results stay hidden from the patient (`isReleased: false`) until the ordering doctor reviews and releases them.
- **Appointments** — supports recurring series (`recurrenceRule`/`recurrenceEndDate`), doctor-defined `BlockedSlot`s, patient-initiated reschedule (cancels + creates a linked appointment), and a `Waitlist` that auto-books the earliest waiting patient when a slot is cancelled.
- **Share links** (`ShareLink` model) — patient-generated, expiring, revocable tokens; `/share/[token]` is a public route (outside the auth middleware) showing a read-only summary.
- **Audit log** (`AuditLog` model, `src/lib/audit.ts`) — every sensitive read/write logs actor, action, resource, and patient; viewable at `/admin-audit-log`.
- **Bulk import** — admin uploads a CSV (`firstName,lastName,email,dateOfBirth,phone,gender`) to `/admin-bulk-import`; creates `User` + `Patient` rows and records an `ImportBatch`.
- **Global search** — `/admin-search` queries patients, doctors, appointments, and medical records with department/status/date filters.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build & serve
- `npm run db:push` — push the Prisma schema to the database
- `npm run db:seed` — reset and reseed demo data (all 5 roles, appointments, records, prescriptions, lab results, vitals, notifications)
- `npm run db:studio` — open Prisma Studio to browse the database

## Structure

- `prisma/schema.prisma` — full data model (User/Role, Patient, Doctor, Nurse, LabTechnician, Appointment, MedicalRecord, Prescription, LabResult, Referral, RefillRequest, Waitlist, BlockedSlot, ShareLink, AuditLog, ImportBatch, Notification, Message)
- `src/middleware.ts` — auth + role-based route protection
- `src/app/(dashboard)/` — patient route group (Dashboard, Profile, Appointments, Medical Records, Prescriptions)
- `src/app/(doctor)/`, `src/app/(nurse)/`, `src/app/(lab)/`, `src/app/(admin)/` — role-specific route groups, each sharing the `AppShell` layout
- `src/app/share/[token]/` — public, unauthenticated share-link view
- `src/components/dashboard/app-shell.tsx` — role-aware sidebar/header shell used by every route group
- `src/lib/data.ts` — server-side data access helpers
- `src/lib/notifications.ts`, `src/lib/audit.ts` — notification and audit-log helpers used across server actions
