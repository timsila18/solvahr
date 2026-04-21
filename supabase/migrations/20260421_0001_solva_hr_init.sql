create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'Super Admin',
      'HR Admin',
      'Payroll Admin',
      'Finance Officer',
      'Manager',
      'Recruiter',
      'Employee',
      'Auditor',
      'Operator',
      'Supervisor'
    );
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  location text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.designations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.job_grades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  level_rank integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.payroll_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  frequency text not null default 'Monthly',
  currency text not null default 'KES',
  cut_off_day integer,
  pay_day integer,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, name)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_number text not null unique,
  first_name text not null,
  last_name text not null,
  national_id text,
  kra_pin text,
  shif_number text,
  nssf_number text,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  employment_type text,
  department_id uuid references public.departments(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  designation_id uuid references public.designations(id) on delete set null,
  job_grade_id uuid references public.job_grades(id) on delete set null,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  hire_date date,
  confirmation_date date,
  contract_end_date date,
  payroll_group_id uuid references public.payroll_groups(id) on delete set null,
  bank_name text,
  bank_branch text,
  bank_account text,
  salary numeric(14,2) not null default 0,
  status text not null default 'active',
  next_of_kin jsonb not null default '{}'::jsonb,
  emergency_contact jsonb not null default '{}'::jsonb,
  profile_photo text,
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key,
  company_id uuid references public.companies(id) on delete set null,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_role not null default 'Employee',
  employee_id uuid unique references public.employees(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  last_login timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.approval_workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_key text not null,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.approval_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  workflow_id uuid references public.approval_workflows(id) on delete set null,
  module_key text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  description text,
  requested_by uuid references public.users(id) on delete set null,
  owner_role public.app_role not null,
  status text not null default 'pending',
  stage text not null,
  approval_chain jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  module_key text not null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references public.users(id) on delete set null,
  actor_email text,
  actor_role public.app_role,
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,
  ip_address text,
  device_info text,
  approval_action text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null,
  link_href text,
  status text not null default 'unread',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  days numeric(8,2) not null,
  reason text,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_label text not null,
  payroll_type text not null,
  status text not null default 'draft',
  processed_at timestamptz,
  gross_pay numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  employer_cost numeric(14,2) not null default 0,
  paye_total numeric(14,2) not null default 0,
  shif_total numeric(14,2) not null default 0,
  housing_levy_total numeric(14,2) not null default 0,
  nssf_total numeric(14,2) not null default 0,
  pension_total numeric(14,2) not null default 0,
  validation_errors integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_employees (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  basic_salary numeric(14,2) not null default 0,
  allowances jsonb not null default '{}'::jsonb,
  deductions jsonb not null default '{}'::jsonb,
  gross_pay numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  status text not null default 'ready',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (payroll_run_id, employee_id)
);

create table if not exists public.payroll_approvals (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  stage_name text not null,
  owner_role public.app_role not null,
  acted_by uuid references public.users(id) on delete set null,
  status text not null default 'queued',
  comments text,
  acted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  export_type text not null,
  file_name text,
  storage_bucket text,
  storage_path text,
  status text not null default 'ready',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  category text not null,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  program_name text not null,
  schedule text not null,
  budget numeric(14,2) not null default 0,
  notes text,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  asset_name text not null,
  request_type text not null,
  branch_id uuid references public.branches(id) on delete set null,
  notes text,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recruitment_requisitions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid references public.users(id) on delete set null,
  role_title text not null,
  department_id uuid references public.departments(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  headcount integer not null default 1,
  notes text,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'Employee'),
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (select role from public.users where id = auth.uid()),
    coalesce((auth.jwt() ->> 'role')::public.app_role, 'Employee'::public.app_role)
  );
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
as $$
  select employee_id from public.users where id = auth.uid();
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
as $$
  select public.current_app_role() = any(roles);
$$;

create or replace function public.is_supervisor_for(target_employee_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.employees target
    where target.id = target_employee_id
      and target.supervisor_employee_id = public.current_employee_id()
  );
$$;

create or replace function public.can_access_employee(target_employee_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Operator','Supervisor']::public.app_role[])
    or public.current_employee_id() = target_employee_id
    or public.is_supervisor_for(target_employee_id);
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies',
    'branches',
    'departments',
    'designations',
    'job_grades',
    'payroll_groups',
    'employees',
    'users',
    'approval_workflows',
    'approval_tasks',
    'audit_logs',
    'notifications',
    'leave_requests',
    'payroll_runs',
    'payroll_employees',
    'payroll_approvals',
    'payroll_exports',
    'employee_documents',
    'training_requests',
    'asset_requests',
    'recruitment_requisitions'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

create policy "companies_select_admin" on public.companies
for select
using (public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[]));

create policy "branches_select_authenticated" on public.branches
for select
using (auth.role() = 'authenticated');

create policy "branches_manage_admin" on public.branches
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

create policy "departments_select_authenticated" on public.departments
for select
using (auth.role() = 'authenticated');

create policy "departments_manage_admin" on public.departments
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

create policy "designations_select_authenticated" on public.designations
for select
using (auth.role() = 'authenticated');

create policy "designations_manage_admin" on public.designations
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

create policy "job_grades_select_authenticated" on public.job_grades
for select
using (auth.role() = 'authenticated');

create policy "job_grades_manage_admin" on public.job_grades
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

create policy "payroll_groups_select_authenticated" on public.payroll_groups
for select
using (auth.role() = 'authenticated');

create policy "payroll_groups_manage_admin" on public.payroll_groups
for all
using (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]));

create policy "users_select_self_or_admin" on public.users
for select
using (
  id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin','Auditor']::public.app_role[])
);

create policy "users_update_self_or_admin" on public.users
for update
using (
  id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin']::public.app_role[])
)
with check (
  id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

create policy "employees_select_by_scope" on public.employees
for select
using (public.can_access_employee(id));

create policy "employees_insert_people_roles" on public.employees
for insert
with check (
  public.has_role(array['Super Admin','HR Admin','Operator','Supervisor']::public.app_role[])
);

create policy "employees_update_people_roles" on public.employees
for update
using (public.can_access_employee(id))
with check (
  public.has_role(array['Super Admin','HR Admin','Operator','Supervisor']::public.app_role[])
);

create policy "approval_workflows_select_authenticated" on public.approval_workflows
for select
using (auth.role() = 'authenticated');

create policy "approval_workflows_manage_admin" on public.approval_workflows
for all
using (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[]));

create policy "approval_tasks_select_scoped" on public.approval_tasks
for select
using (
  requested_by = auth.uid()
  or owner_role = public.current_app_role()
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

create policy "approval_tasks_insert_authenticated" on public.approval_tasks
for insert
with check (auth.role() = 'authenticated');

create policy "approval_tasks_update_owner_or_admin" on public.approval_tasks
for update
using (
  owner_role = public.current_app_role()
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  owner_role = public.current_app_role()
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

create policy "audit_logs_select_control_roles" on public.audit_logs
for select
using (
  public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

create policy "audit_logs_insert_authenticated" on public.audit_logs
for insert
with check (auth.role() = 'authenticated');

create policy "notifications_select_self_or_admin" on public.notifications
for select
using (
  user_id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

create policy "notifications_insert_admin" on public.notifications
for insert
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

create policy "leave_requests_select_scoped" on public.leave_requests
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Auditor']::public.app_role[])
);

create policy "leave_requests_insert_scoped" on public.leave_requests
for insert
with check (
  public.current_employee_id() = employee_id
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
);

create policy "leave_requests_update_scoped" on public.leave_requests
for update
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
);

create policy "payroll_runs_select_payroll_roles" on public.payroll_runs
for select
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

create policy "payroll_runs_manage_payroll_roles" on public.payroll_runs
for all
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

create policy "payroll_employees_select_scoped" on public.payroll_employees
for select
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
  or employee_id = public.current_employee_id()
);

create policy "payroll_employees_manage_payroll_roles" on public.payroll_employees
for all
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

create policy "payroll_approvals_select_payroll_roles" on public.payroll_approvals
for select
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

create policy "payroll_approvals_manage_payroll_roles" on public.payroll_approvals
for all
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

create policy "payroll_exports_select_payroll_roles" on public.payroll_exports
for select
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

create policy "payroll_exports_manage_payroll_roles" on public.payroll_exports
for all
using (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

create policy "employee_documents_select_scoped" on public.employee_documents
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Auditor']::public.app_role[])
);

create policy "employee_documents_manage_scoped" on public.employee_documents
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

create policy "training_requests_select_scoped" on public.training_requests
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Auditor']::public.app_role[])
);

create policy "training_requests_manage_scoped" on public.training_requests
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

create policy "asset_requests_select_scoped" on public.asset_requests
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Auditor']::public.app_role[])
);

create policy "asset_requests_manage_scoped" on public.asset_requests
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Operator']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Operator']::public.app_role[])
);

create policy "requisitions_select_recruitment_roles" on public.recruitment_requisitions
for select
using (
  public.has_role(array['Super Admin','HR Admin','Recruiter','Manager','Finance Officer','Auditor']::public.app_role[])
);

create policy "requisitions_manage_recruitment_roles" on public.recruitment_requisitions
for all
using (
  public.has_role(array['Super Admin','HR Admin','Recruiter','Manager','Finance Officer']::public.app_role[])
)
with check (
  public.has_role(array['Super Admin','HR Admin','Recruiter','Manager','Finance Officer']::public.app_role[])
);

insert into storage.buckets (id, name, public)
values
  ('employee-documents', 'employee-documents', false),
  ('payroll-documents', 'payroll-documents', false),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "storage_read_authenticated" on storage.objects
for select
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'attachments')
  and auth.role() = 'authenticated'
);

create policy "storage_write_hr_payroll" on storage.objects
for insert
with check (
  bucket_id in ('employee-documents', 'payroll-documents', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

create policy "storage_update_hr_payroll" on storage.objects
for update
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
)
with check (
  bucket_id in ('employee-documents', 'payroll-documents', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

create policy "storage_delete_hr_payroll" on storage.objects
for delete
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);

create trigger set_companies_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

create trigger set_branches_updated_at
before update on public.branches
for each row execute procedure public.set_updated_at();

create trigger set_departments_updated_at
before update on public.departments
for each row execute procedure public.set_updated_at();

create trigger set_designations_updated_at
before update on public.designations
for each row execute procedure public.set_updated_at();

create trigger set_job_grades_updated_at
before update on public.job_grades
for each row execute procedure public.set_updated_at();

create trigger set_payroll_groups_updated_at
before update on public.payroll_groups
for each row execute procedure public.set_updated_at();

create trigger set_employees_updated_at
before update on public.employees
for each row execute procedure public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

create trigger set_approval_workflows_updated_at
before update on public.approval_workflows
for each row execute procedure public.set_updated_at();

create trigger set_approval_tasks_updated_at
before update on public.approval_tasks
for each row execute procedure public.set_updated_at();

create trigger set_leave_requests_updated_at
before update on public.leave_requests
for each row execute procedure public.set_updated_at();

create trigger set_payroll_runs_updated_at
before update on public.payroll_runs
for each row execute procedure public.set_updated_at();

create trigger set_payroll_employees_updated_at
before update on public.payroll_employees
for each row execute procedure public.set_updated_at();

create trigger set_training_requests_updated_at
before update on public.training_requests
for each row execute procedure public.set_updated_at();

create trigger set_asset_requests_updated_at
before update on public.asset_requests
for each row execute procedure public.set_updated_at();

create trigger set_recruitment_requisitions_updated_at
before update on public.recruitment_requisitions
for each row execute procedure public.set_updated_at();
