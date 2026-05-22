alter table public.users
  add column if not exists invited_by uuid references public.users(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists activation_state text not null default 'active',
  add column if not exists must_reset_password boolean not null default false;

alter table public.approval_workflows
  add column if not exists module_scope text not null default 'company-wide',
  add column if not exists escalation_rule jsonb not null default '{}'::jsonb,
  add column if not exists maker_checker_enabled boolean not null default false,
  add column if not exists final_approval_required boolean not null default true;

alter table public.branches
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists manager_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists holiday_calendar_id uuid;

alter table public.departments
  add column if not exists head_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists parent_department_id uuid references public.departments(id) on delete set null;

create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  primary_email text,
  phone text,
  physical_address text,
  registration_number text,
  tax_pin text,
  default_currency text not null default 'KES',
  country text not null default 'Kenya',
  timezone text not null default 'Africa/Nairobi',
  working_days jsonb not null default '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  payroll_defaults jsonb not null default '{"frequency":"Monthly","cutOffDay":25,"payDay":28}'::jsonb,
  leave_year_settings jsonb not null default '{"startMonth":1,"carryForwardCap":5}'::jsonb,
  branding jsonb not null default '{"documentFooter":"Powered by Solva HR","logoMode":"light"}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_definitions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_key text not null,
  name text not null,
  description text,
  scope_type text not null default 'company-wide',
  status text not null default 'active',
  is_system boolean not null default true,
  assignable boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, role_key)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_key text not null,
  module_key text not null,
  scope_type text not null default 'company-wide',
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_approve boolean not null default false,
  can_export boolean not null default false,
  can_delete boolean not null default false,
  can_admin boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, role_key, module_key)
);

create table if not exists public.notification_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  event_preferences jsonb not null default '{"approvals":true,"payroll":true,"leave":true,"recruitment":true}'::jsonb,
  reminder_preferences jsonb not null default '{"pendingApprovals":true,"documentExpiry":false,"dailyDigest":false}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.security_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  session_timeout_minutes integer not null default 60,
  password_policy jsonb not null default '{"minLength":8,"requireUpper":true,"requireNumber":true,"requireSymbol":true}'::jsonb,
  mfa_required boolean not null default false,
  download_restrictions jsonb not null default '{"maskSensitiveExports":false,"watermarkPayslips":false}'::jsonb,
  document_access jsonb not null default '{"medical":"restricted","disciplinary":"restricted","general":"standard"}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.login_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  email text,
  role text,
  action text not null default 'login',
  status text not null default 'success',
  device_info text,
  ip_address text,
  location_hint text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text,
  user_role text,
  module_key text not null,
  action text not null,
  record_type text,
  record_id text,
  outcome text not null default 'success',
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  device_info text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.data_import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  import_type text not null,
  file_name text,
  status text not null default 'queued',
  row_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  error_summary jsonb not null default '[]'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.company_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

insert into public.notification_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

insert into public.security_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

insert into public.role_definitions (company_id, role_key, name, description, scope_type, is_system, assignable)
select
  companies.id,
  roles.role_key,
  roles.role_key,
  roles.description,
  roles.scope_type,
  true,
  true
from public.companies
cross join (
  values
    ('Super Admin', 'Global control across the Solva HR platform.', 'global'),
    ('HR Admin', 'HR operations, people records, workflows, and policy control.', 'company-wide'),
    ('Payroll Admin', 'Payroll processing, reviews, and exports.', 'company-wide'),
    ('Finance Officer', 'Finance oversight, payroll signoff, and export visibility.', 'company-wide'),
    ('Manager', 'Team approvals and department-facing operations.', 'team-only'),
    ('Recruiter', 'Recruitment execution and applicant workflows.', 'department-specific'),
    ('Employee', 'Self-service access to own records and requests.', 'self-only'),
    ('Auditor', 'Read-only oversight across compliance and audit surfaces.', 'company-wide'),
    ('Operator', 'Operational setup and draft preparation activities.', 'branch-specific'),
    ('Supervisor', 'Supervisor approvals and direct-report visibility.', 'team-only')
) as roles(role_key, description, scope_type)
on conflict (company_id, role_key) do nothing;

insert into public.role_permissions (
  company_id,
  role_key,
  module_key,
  scope_type,
  can_view,
  can_create,
  can_edit,
  can_approve,
  can_export,
  can_delete,
  can_admin
)
select
  companies.id,
  matrix.role_key,
  matrix.module_key,
  matrix.scope_type,
  matrix.can_view,
  matrix.can_create,
  matrix.can_edit,
  matrix.can_approve,
  matrix.can_export,
  matrix.can_delete,
  matrix.can_admin
from public.companies
cross join (
  values
    ('Super Admin','dashboard','global', true, true, true, true, true, true, true),
    ('Super Admin','people','global', true, true, true, true, true, true, true),
    ('Super Admin','payroll','global', true, true, true, true, true, true, true),
    ('Super Admin','leave','global', true, true, true, true, true, true, true),
    ('Super Admin','recruitment','global', true, true, true, true, true, true, true),
    ('Super Admin','performance','global', true, true, true, true, true, true, true),
    ('Super Admin','training','global', true, true, true, true, true, true, true),
    ('Super Admin','assets','global', true, true, true, true, true, true, true),
    ('Super Admin','ess','global', true, true, true, true, true, true, true),
    ('Super Admin','reports','global', true, true, true, true, true, true, true),
    ('Super Admin','settings','global', true, true, true, true, true, true, true),
    ('Super Admin','audit','global', true, true, true, true, true, true, true),
    ('Super Admin','integrations','global', true, true, true, true, true, true, true),
    ('Super Admin','consultancy','global', true, true, true, true, true, true, true),
    ('Super Admin','administration','global', true, true, true, true, true, true, true),
    ('HR Admin','dashboard','company-wide', true, false, false, true, true, false, false),
    ('HR Admin','people','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','leave','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','recruitment','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','performance','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','training','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','assets','company-wide', true, true, true, true, true, false, false),
    ('HR Admin','ess','company-wide', true, true, true, true, false, false, false),
    ('HR Admin','reports','company-wide', true, false, false, false, true, false, false),
    ('HR Admin','settings','company-wide', true, true, true, true, false, false, true),
    ('HR Admin','audit','company-wide', true, false, false, false, true, false, false),
    ('HR Admin','integrations','company-wide', true, false, true, false, false, false, false),
    ('HR Admin','administration','company-wide', true, true, true, true, true, false, true),
    ('Payroll Admin','dashboard','company-wide', true, false, false, true, true, false, false),
    ('Payroll Admin','payroll','company-wide', true, true, true, true, true, false, false),
    ('Payroll Admin','reports','company-wide', true, false, false, false, true, false, false),
    ('Payroll Admin','settings','company-wide', true, true, true, true, false, false, true),
    ('Payroll Admin','audit','company-wide', true, false, false, false, true, false, false),
    ('Payroll Admin','integrations','company-wide', true, false, true, false, false, false, false),
    ('Payroll Admin','administration','company-wide', true, true, true, true, true, false, true),
    ('Finance Officer','dashboard','company-wide', true, false, false, true, true, false, false),
    ('Finance Officer','payroll','company-wide', true, false, false, true, true, false, false),
    ('Finance Officer','reports','company-wide', true, false, false, false, true, false, false),
    ('Finance Officer','audit','company-wide', true, false, false, false, true, false, false),
    ('Finance Officer','consultancy','company-wide', true, false, false, false, true, false, false),
    ('Finance Officer','administration','company-wide', true, false, true, false, true, false, false),
    ('Manager','dashboard','team-only', true, false, false, true, false, false, false),
    ('Manager','people','team-only', true, false, true, true, true, false, false),
    ('Manager','leave','team-only', true, true, true, true, true, false, false),
    ('Manager','recruitment','team-only', true, true, true, true, true, false, false),
    ('Manager','performance','team-only', true, true, true, true, true, false, false),
    ('Manager','training','team-only', true, true, true, true, true, false, false),
    ('Manager','ess','self-only', true, true, true, false, false, false, false),
    ('Manager','reports','department-specific', true, false, false, false, true, false, false),
    ('Recruiter','dashboard','department-specific', true, false, false, false, false, false, false),
    ('Recruiter','recruitment','department-specific', true, true, true, true, true, false, false),
    ('Recruiter','ess','self-only', true, true, true, false, false, false, false),
    ('Employee','dashboard','self-only', true, false, false, false, false, false, false),
    ('Employee','people','self-only', true, false, false, false, false, false, false),
    ('Employee','payroll','self-only', true, false, false, false, true, false, false),
    ('Employee','leave','self-only', true, true, true, false, false, false, false),
    ('Employee','performance','self-only', true, true, true, false, false, false, false),
    ('Employee','training','self-only', true, true, true, false, false, false, false),
    ('Employee','assets','self-only', true, true, false, false, false, false, false),
    ('Employee','ess','self-only', true, true, true, false, true, false, false),
    ('Auditor','dashboard','company-wide', true, false, false, false, true, false, false),
    ('Auditor','people','company-wide', true, false, false, false, true, false, false),
    ('Auditor','payroll','company-wide', true, false, false, false, true, false, false),
    ('Auditor','leave','company-wide', true, false, false, false, true, false, false),
    ('Auditor','recruitment','company-wide', true, false, false, false, true, false, false),
    ('Auditor','performance','company-wide', true, false, false, false, true, false, false),
    ('Auditor','training','company-wide', true, false, false, false, true, false, false),
    ('Auditor','assets','company-wide', true, false, false, false, true, false, false),
    ('Auditor','ess','company-wide', true, false, false, false, false, false, false),
    ('Auditor','reports','company-wide', true, false, false, false, true, false, false),
    ('Auditor','audit','company-wide', true, false, false, false, true, false, false),
    ('Auditor','consultancy','company-wide', true, false, false, false, true, false, false),
    ('Auditor','administration','company-wide', true, false, false, false, true, false, false),
    ('Operator','dashboard','branch-specific', true, false, false, false, false, false, false),
    ('Operator','people','branch-specific', true, true, true, false, true, false, false),
    ('Operator','assets','branch-specific', true, true, true, false, false, false, false),
    ('Operator','ess','self-only', true, true, true, false, false, false, false),
    ('Supervisor','dashboard','team-only', true, false, false, true, false, false, false),
    ('Supervisor','people','team-only', true, true, true, true, true, false, false),
    ('Supervisor','leave','team-only', true, true, true, true, true, false, false),
    ('Supervisor','assets','team-only', true, true, true, true, false, false, false),
    ('Supervisor','ess','self-only', true, true, true, false, false, false, false)
) as matrix(role_key, module_key, scope_type, can_view, can_create, can_edit, can_approve, can_export, can_delete, can_admin)
on conflict (company_id, role_key, module_key) do nothing;

alter table public.company_settings enable row level security;
alter table public.role_definitions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.notification_settings enable row level security;
alter table public.security_settings enable row level security;
alter table public.login_sessions enable row level security;
alter table public.access_logs enable row level security;
alter table public.data_import_jobs enable row level security;

drop policy if exists "company_settings_select_admin" on public.company_settings;
create policy "company_settings_select_admin" on public.company_settings
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "company_settings_manage_admin" on public.company_settings;
create policy "company_settings_manage_admin" on public.company_settings
for all using (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]));

drop policy if exists "role_definitions_select_admin" on public.role_definitions;
create policy "role_definitions_select_admin" on public.role_definitions
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "role_definitions_manage_admin" on public.role_definitions;
create policy "role_definitions_manage_admin" on public.role_definitions
for all using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "role_permissions_select_admin" on public.role_permissions;
create policy "role_permissions_select_admin" on public.role_permissions
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "role_permissions_manage_admin" on public.role_permissions;
create policy "role_permissions_manage_admin" on public.role_permissions
for all using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "notification_settings_select_admin" on public.notification_settings;
create policy "notification_settings_select_admin" on public.notification_settings
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "notification_settings_manage_admin" on public.notification_settings;
create policy "notification_settings_manage_admin" on public.notification_settings
for all using (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]));

drop policy if exists "security_settings_select_admin" on public.security_settings;
create policy "security_settings_select_admin" on public.security_settings
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "security_settings_manage_admin" on public.security_settings;
create policy "security_settings_manage_admin" on public.security_settings
for all using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "login_sessions_select_admin" on public.login_sessions;
create policy "login_sessions_select_admin" on public.login_sessions
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "login_sessions_insert_authenticated" on public.login_sessions;
create policy "login_sessions_insert_authenticated" on public.login_sessions
for insert with check (auth.uid() is not null);

drop policy if exists "access_logs_select_admin" on public.access_logs;
create policy "access_logs_select_admin" on public.access_logs
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

drop policy if exists "access_logs_insert_authenticated" on public.access_logs;
create policy "access_logs_insert_authenticated" on public.access_logs
for insert with check (auth.uid() is not null);

drop policy if exists "data_import_jobs_select_admin" on public.data_import_jobs;
create policy "data_import_jobs_select_admin" on public.data_import_jobs
for select using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "data_import_jobs_manage_admin" on public.data_import_jobs;
create policy "data_import_jobs_manage_admin" on public.data_import_jobs
for all using (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]));

drop trigger if exists set_company_settings_updated_at on public.company_settings;
create trigger set_company_settings_updated_at
before update on public.company_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_role_definitions_updated_at on public.role_definitions;
create trigger set_role_definitions_updated_at
before update on public.role_definitions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_role_permissions_updated_at on public.role_permissions;
create trigger set_role_permissions_updated_at
before update on public.role_permissions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_notification_settings_updated_at on public.notification_settings;
create trigger set_notification_settings_updated_at
before update on public.notification_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_security_settings_updated_at on public.security_settings;
create trigger set_security_settings_updated_at
before update on public.security_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_login_sessions_updated_at on public.login_sessions;
create trigger set_login_sessions_updated_at
before update on public.login_sessions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_data_import_jobs_updated_at on public.data_import_jobs;
create trigger set_data_import_jobs_updated_at
before update on public.data_import_jobs
for each row execute procedure public.set_updated_at();
