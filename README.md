# Solva HRIS

Solva HRIS is a production-oriented starter for a multi-tenant HR and payroll operating system for Kenyan and African employers. It is organized as a TypeScript monorepo with a Next.js web app, an API service, shared domain logic, and a PostgreSQL schema.

## What Is Included

- Multi-tenant company and organization model
- Granular RBAC permission catalogue
- Employee master records and document metadata model
- Leave policy, balance, request, and approval model
- Kenya-ready payroll architecture with effective-dated statutory rules
- Demo payroll calculation engine in `packages/shared`
- Metadata-driven report and export template definitions
- Audit log model for critical HR and payroll actions
- Enterprise dashboard UI scaffold for the application shell
- Docker Compose PostgreSQL service

## Local Setup

1. Copy `.env.example` to `.env`.
2. Add the Supabase Postgres password or full connection string from Supabase project settings.
3. Install dependencies with `npm install`.
4. Generate Prisma types with `npm run db:generate`.
5. Run migrations with `npm run db:migrate`.
6. Start the web app with `npm run dev`.
7. Start the API with `npm run dev:api`.

For local-only development, `docker-compose.yml` still provides a disposable PostgreSQL database, but the intended hosted database target is Supabase project `shjjeushhoeaniiwtzup`.

## Architecture

Read `docs/ARCHITECTURE.md` for the service boundaries, module plan, and payroll/reporting design.

## Staging Deploy

`render.yaml` defines two Render staging web services:

- `solva-hris-api-staging`
- `solva-hris-web-staging`

Set the secret values in Render, not in git: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. After Render creates the API service, set `NEXT_PUBLIC_API_URL` on the web service to the API service's public `.onrender.com` URL.

If the GitHub repository is private, authorize the Render GitHub app for `timsila18/solvahr` before creating the Blueprint. Without that authorization, Render's API cannot fetch the repository even when the Render API key is valid.

## Payroll Compliance Note

Statutory configuration must be reviewed by a qualified payroll/compliance professional before production use. The code intentionally treats rates, bands, caps, filing templates, and due dates as effective-dated configuration rather than permanent source-code constants.
