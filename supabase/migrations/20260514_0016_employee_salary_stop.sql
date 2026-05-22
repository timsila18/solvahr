alter table public.employees
  add column if not exists salary_stop_active boolean not null default false,
  add column if not exists salary_stop_reason text,
  add column if not exists salary_stop_effective_date date,
  add column if not exists salary_stop_updated_at timestamptz,
  add column if not exists salary_stop_updated_by text;
