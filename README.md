# Solva HR

Solva HR is a Kenyan cloud-based HR and payroll platform built with Next.js, TypeScript, Supabase, and PostgreSQL. The current foundation is focused on getting the system live against a real backend first, then finishing modules slice by slice on persistent data.

## Current Live Scope

The following parts are now wired to Supabase instead of in-memory mock state:

- Supabase Auth login, forgot password, reset password, callback handling, and sign out
- Protected app shell with middleware-based session checks
- Profile-aware platform snapshot and role-filtered module visibility
- People API for employee list, employee detail, employee create, and employee update
- Employee document APIs for upload, list, signed download URL generation, and delete
- Lookup CRUD APIs for branches, departments, designations, job grades, and payroll groups
- Leave and Attendance APIs for leave requests, balances, policies, holidays, attendance records, and overtime queues
- Payroll APIs for package summary, periods, employee payroll data, review, process state, payslips, statutory summaries, exports, settings, and audit trail
- Approval task APIs and audit log APIs

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
DATABASE_URL=
DIRECT_URL=
SUPABASE_EMPLOYEE_DOCUMENTS_BUCKET=employee-documents
SUPABASE_PAYROLL_DOCUMENTS_BUCKET=payroll-documents
SUPABASE_PAYSLIPS_BUCKET=payslips
SUPABASE_COMPANY_ASSETS_BUCKET=company-assets
SUPABASE_ATTACHMENTS_BUCKET=attachments
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback?next=/reset-password
```

Important:

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
- `NEXT_PUBLIC_*` values are safe for the browser.
- `SUPABASE_DB_URL` or `DIRECT_URL` is used by the SQL runner for migrations and seed scripts.

## Local Setup

```bash
npm install --ignore-scripts
npm run build
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Supabase Setup

Run the schema migration:

```bash
npm run db:migrate
node scripts/run-sql.mjs supabase/migrations/20260421_0002_storage_expansion.sql
node scripts/run-sql.mjs supabase/migrations/20260421_0003_leave_attendance_schema.sql
```

Run seed data:

```bash
npm run db:seed
node scripts/seed-auth-users.mjs
node scripts/run-sql.mjs supabase/seeds/20260421_leave_attendance_seed.sql
```

What the seed creates:

- 1 demo company
- 5 branches
- 8 departments
- 7 designations
- 5 job grades
- 3 payroll groups
- 100 employees
- 2 payroll runs
- 100 payroll employee rows
- 10 Supabase Auth demo users
- 5 leave policies
- 200 leave balances
- 200 attendance records
- 40 overtime requests
- 5 holidays

## Demo Accounts

All seeded demo users currently use this password unless overridden by `SOLVA_DEMO_PASSWORD`:

```text
SolvaHR!2026
```

Seeded accounts:

- `superadmin@solvahr.app`
- `hradmin@solvahr.app`
- `payrolladmin@solvahr.app`
- `finance@solvahr.app`
- `manager@solvahr.app`
- `recruiter@solvahr.app`
- `employee@solvahr.app`
- `auditor@solvahr.app`
- `operator@solvahr.app`
- `supervisor@solvahr.app`

## Storage Buckets

The current setup expects these private buckets:

- `employee-documents`
- `payroll-documents`
- `payslips`
- `company-assets`
- `attachments`

Employee documents are uploaded to storage through server-side logic and returned through short-lived signed URLs.

## Vercel Setup

Set the same environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_EMPLOYEE_DOCUMENTS_BUCKET`
- `SUPABASE_PAYROLL_DOCUMENTS_BUCKET`
- `SUPABASE_PAYSLIPS_BUCKET`
- `SUPABASE_COMPANY_ASSETS_BUCKET`
- `SUPABASE_ATTACHMENTS_BUCKET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL`

Then deploy:

```bash
npx vercel --prod
```

## Role Notes

Current role model:

- Super Admin
- HR Admin
- Payroll Admin
- Finance Officer
- Manager
- Recruiter
- Employee
- Auditor
- Operator
- Supervisor

Current access highlights:

- Employees are scoped to their own employee-linked records
- Managers and Supervisors are scoped through team relationships
- HR and Payroll admin roles retain broader operational access
- Audit-sensitive actions are logged in `audit_logs`

## Live Routes Ready For Testing

- `/`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/unauthorized`
- `/forbidden`

Key API routes:

- `/api/platform`
- `/api/approval-tasks`
- `/api/audit-logs`
- `/api/people/employees`
- `/api/people/employees/[employeeId]`
- `/api/people/employees/[employeeId]/documents`
- `/api/people/employees/[employeeId]/documents/[documentId]`
- `/api/lookups/[table]`
- `/api/lookups/[table]/[recordId]`
- `/api/leave/dashboard`
- `/api/leave/requests`
- `/api/leave/balances`
- `/api/leave/policies`
- `/api/leave/holidays`
- `/api/attendance/records`
- `/api/attendance/overtime`
- `/api/payroll/package`
- `/api/payroll/periods`
- `/api/payroll/employee-data`
- `/api/payroll/review`
- `/api/payroll/process`
- `/api/payroll/payslips`
- `/api/payroll/payslips/[employeeId]`
- `/api/payroll/statutory-reports`
- `/api/payroll/settings`
- `/api/payroll/audit-trail`

## Known Gaps

These areas are still in progress:

- Full People CRUD screens beyond the current shell interactions
- Dedicated lookup management screens
- Real notification center UI
- Rich payroll approval screen actions in the frontend
- PDF payslip file generation and storage-backed payslip files
- Full RLS verification matrix documented role by role
- Full production deployment verification on Vercel using the live Supabase project

## Recommended Next Phase

The best next build slice is:

1. Finish People module screens fully on live data
2. Finish Payroll review, approval, payslip, and export screens fully on live data
3. Verify Vercel production against the real Supabase project
