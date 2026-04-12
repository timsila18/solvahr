# Solva HRIS Architecture

## Product Shape

Solva HRIS is a modular SaaS HR platform. Each tenant company has isolated employees, organization settings, payroll periods, leave policies, workflows, report templates, export templates, documents, and audit logs.

## Monorepo Layout

- `apps/web`: Next.js application shell and enterprise UI screens
- `apps/api`: TypeScript API service scaffold
- `packages/shared`: domain types, RBAC catalogue, payroll engine, report builder primitives
- `prisma`: PostgreSQL relational schema targeting Supabase-hosted Postgres in production
- `docs`: product and technical documentation
- `tests`: smoke tests and future integration tests

## Backend Modules

The API is designed around module boundaries:

- Auth and RBAC
- Companies and organization structure
- Employee records
- Leave management
- Payroll processing
- Report builder and export templates
- Audit logs
- Workflow approvals
- Notifications

## Phase 2 Domain Flow

Recruitment begins with a manpower requisition, then converts into a vacancy. Candidates move through pipeline stages, interview records capture panel scheduling and scorecards, and offers can trigger approval workflows. Accepted offers feed onboarding tasks and employee record conversion. Probation reviews use the same workflow engine so recommendations, extensions, confirmations, and non-confirmations remain auditable.

## Supabase

Production database hosting is Supabase project `shjjeushhoeaniiwtzup`. The application uses Prisma against Supabase Postgres for relational HRIS data. Supabase environment values are loaded from `.env`; the service secret must remain server-only and must never be exposed to browser code.

## Payroll Architecture

Payroll is a rules engine. A payroll run captures a period snapshot, employee salary setup, recurring pay components, variable inputs, statutory rule versions, and approval state. Calculations generate line-level results for earnings, deductions, employer costs, exceptions, payslips, and reports.

Statutory configuration is stored by country, rule code, effective dates, formula type, thresholds, caps, rates, relief metadata, and export mapping. This allows Kenya rules such as PAYE, SHA/SHIF, NSSF, and Affordable Housing Levy to evolve without rebuilding the product.

## Report Builder Architecture

Reports are metadata-driven. A saved report chooses a dataset, columns, filters, grouping, aggregations, formula columns, sort order, branding, and export format. The same engine powers payroll registers, wage bill summaries, statutory schedules, employee reports, leave reports, and management dashboards.

## Security Principles

- Tenant ID is mandatory on tenant-owned records.
- Sensitive actions write audit logs.
- Permissions are granular and grouped by module/action.
- Payroll locking prevents mutation after approval.
- Document access is controlled by document category and role.
- Export generation records download history and user identity.
