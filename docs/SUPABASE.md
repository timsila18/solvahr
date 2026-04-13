# Supabase Setup

Supabase project: `shjjeushhoeaniiwtzup`

## Required Secrets

The application already knows the Supabase project URL and public API key. Real database work requires Supabase Postgres connection strings.

Set these values in local `.env` and Render:

- `DATABASE_URL`
- `DIRECT_URL`

For Supabase, the pooler URLs usually follow these shapes:

```text
postgresql://postgres.shjjeushhoeaniiwtzup:<database-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
postgresql://postgres.shjjeushhoeaniiwtzup:<database-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

The Supabase publishable key and secret key are API keys. They are not the database password.

## Activation Status

The initial Prisma schema has been migrated to Supabase and the demo tenant seed has been applied.

Use the Supabase pooler URLs for application runtime and migrations:

- `DATABASE_URL`: transaction pooler URL on port `6543`
- `DIRECT_URL`: session pooler URL on port `5432`

The direct `db.<project-ref>.supabase.co` host can be IPv6-only from some environments, so the pooler URLs are the preferred Render configuration.

## Apply Schema

After `DATABASE_URL` and `DIRECT_URL` are set:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

`prisma/migrations/0001_initial/migration.sql` contains the initial schema SQL that will create the HRIS tables, enums, indexes, and constraints in Supabase Postgres.

## Render

The Render services are live. Set `DATABASE_URL` and `DIRECT_URL` on the API service so staging uses Supabase instead of demo-data fallback.

After setting both database URLs in Render, redeploy:

```bash
npm run db:deploy
npm run db:seed
```

In production we should run migrations from a controlled CI/deploy step rather than exposing any database setup endpoint in the API.
