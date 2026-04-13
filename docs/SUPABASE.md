# Supabase Setup

Supabase project: `shjjeushhoeaniiwtzup`

## Required Secrets

The application already knows the Supabase project URL and public API key. The remaining required value for real database work is the Supabase Postgres connection string.

Set these values in local `.env` and Render:

- `DATABASE_URL`
- `DIRECT_URL`

For Supabase, the direct Postgres URL usually follows this shape:

```text
postgresql://postgres:<database-password>@db.shjjeushhoeaniiwtzup.supabase.co:5432/postgres?schema=public
```

The Supabase publishable key and secret key are API keys. They are not the database password.

## Apply Schema

After `DATABASE_URL` and `DIRECT_URL` are set:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

`prisma/migrations/0001_initial/migration.sql` contains the initial schema SQL that will create the HRIS tables, enums, indexes, and constraints in Supabase Postgres.

## Render

The Render services are already live, but the staging API is currently operating with demo-data fallback because `DATABASE_URL` and `DIRECT_URL` are not set yet.

After setting both database URLs in Render, redeploy:

```bash
npm run db:deploy
npm run db:seed
```

In production we should run migrations from a controlled CI/deploy step rather than exposing any database setup endpoint in the API.
