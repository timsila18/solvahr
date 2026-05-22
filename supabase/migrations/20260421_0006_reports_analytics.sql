create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  module_key text not null,
  category text not null,
  name text not null,
  description text,
  definition jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  is_favorite boolean not null default false,
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_id uuid not null references public.report_templates(id) on delete cascade,
  name text not null,
  frequency text not null,
  export_type text not null default 'csv',
  recipients jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_id uuid references public.report_templates(id) on delete set null,
  module_key text not null,
  category text not null,
  report_name text not null,
  report_key text not null,
  filters jsonb not null default '{}'::jsonb,
  export_type text not null,
  status text not null default 'ready',
  file_name text,
  storage_bucket text,
  storage_path text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.report_access_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_id uuid references public.report_templates(id) on delete set null,
  module_key text not null,
  category text not null,
  report_name text not null,
  report_key text not null,
  action text not null,
  filters jsonb not null default '{}'::jsonb,
  export_type text,
  actor_id uuid references public.users(id) on delete set null,
  actor_email text,
  actor_role public.app_role,
  outcome text not null default 'success',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_report_templates_company on public.report_templates(company_id, module_key, category);
create index if not exists idx_scheduled_reports_template on public.scheduled_reports(template_id, status);
create index if not exists idx_report_exports_company on public.report_exports(company_id, module_key, created_at desc);
create index if not exists idx_report_access_logs_company on public.report_access_logs(company_id, module_key, created_at desc);

alter table public.report_templates enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.report_exports enable row level security;
alter table public.report_access_logs enable row level security;

drop policy if exists "report_templates_select_reports_roles" on public.report_templates;
create policy "report_templates_select_reports_roles" on public.report_templates
for select
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop policy if exists "report_templates_manage_reports_roles" on public.report_templates;
create policy "report_templates_manage_reports_roles" on public.report_templates
for all
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop policy if exists "scheduled_reports_select_reports_roles" on public.scheduled_reports;
create policy "scheduled_reports_select_reports_roles" on public.scheduled_reports
for select
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop policy if exists "scheduled_reports_manage_reports_roles" on public.scheduled_reports;
create policy "scheduled_reports_manage_reports_roles" on public.scheduled_reports
for all
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "report_exports_select_reports_roles" on public.report_exports;
create policy "report_exports_select_reports_roles" on public.report_exports
for select
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop policy if exists "report_exports_manage_reports_roles" on public.report_exports;
create policy "report_exports_manage_reports_roles" on public.report_exports
for all
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop policy if exists "report_access_logs_select_reports_roles" on public.report_access_logs;
create policy "report_access_logs_select_reports_roles" on public.report_access_logs
for select
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "report_access_logs_insert_reports_roles" on public.report_access_logs;
create policy "report_access_logs_insert_reports_roles" on public.report_access_logs
for insert
with check (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Manager']::public.app_role[])
);

drop trigger if exists set_report_templates_updated_at on public.report_templates;
create trigger set_report_templates_updated_at
before update on public.report_templates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_scheduled_reports_updated_at on public.scheduled_reports;
create trigger set_scheduled_reports_updated_at
before update on public.scheduled_reports
for each row execute procedure public.set_updated_at();
