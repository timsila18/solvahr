create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null,
  policy_name text not null,
  annual_allowance numeric(8,2) not null default 0,
  accrual_frequency text not null default 'monthly',
  carry_forward_limit numeric(8,2) not null default 0,
  requires_attachment boolean not null default false,
  color text not null default '#2563eb',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, leave_type)
);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  opening_balance numeric(8,2) not null default 0,
  accrued_days numeric(8,2) not null default 0,
  taken_days numeric(8,2) not null default 0,
  pending_days numeric(8,2) not null default 0,
  balance_days numeric(8,2) not null default 0,
  as_of_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, leave_type, as_of_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  shift_name text not null default 'Day Shift',
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  status text not null default 'present',
  minutes_late integer not null default 0,
  minutes_early_leave integer not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, work_date)
);

create table if not exists public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  work_date date not null,
  hours numeric(8,2) not null,
  rate_type text not null default 'standard',
  reason text,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  scope text not null default 'company',
  is_paid boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_leave_policies_company on public.leave_policies(company_id);
create index if not exists idx_leave_balances_employee on public.leave_balances(employee_id, leave_type);
create index if not exists idx_attendance_records_employee_date on public.attendance_records(employee_id, work_date desc);
create index if not exists idx_overtime_requests_employee_date on public.overtime_requests(employee_id, work_date desc);
create index if not exists idx_holidays_company_date on public.holidays(company_id, holiday_date);

alter table public.leave_policies enable row level security;
alter table public.leave_balances enable row level security;
alter table public.attendance_records enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.holidays enable row level security;

drop policy if exists "leave_policies_select_authenticated" on public.leave_policies;
create policy "leave_policies_select_authenticated" on public.leave_policies
for select
using (auth.role() = 'authenticated');

drop policy if exists "leave_policies_manage_hr" on public.leave_policies;
create policy "leave_policies_manage_hr" on public.leave_policies
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_balances_select_scoped" on public.leave_balances;
create policy "leave_balances_select_scoped" on public.leave_balances
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Auditor']::public.app_role[])
);

drop policy if exists "leave_balances_manage_hr" on public.leave_balances;
create policy "leave_balances_manage_hr" on public.leave_balances
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);

drop policy if exists "attendance_records_select_scoped" on public.attendance_records;
create policy "attendance_records_select_scoped" on public.attendance_records
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Auditor']::public.app_role[])
);

drop policy if exists "attendance_records_manage_scoped" on public.attendance_records;
create policy "attendance_records_manage_scoped" on public.attendance_records
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Operator']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Operator']::public.app_role[])
);

drop policy if exists "overtime_requests_select_scoped" on public.overtime_requests;
create policy "overtime_requests_select_scoped" on public.overtime_requests
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Auditor']::public.app_role[])
);

drop policy if exists "overtime_requests_manage_scoped" on public.overtime_requests;
create policy "overtime_requests_manage_scoped" on public.overtime_requests
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[])
);

drop policy if exists "holidays_select_authenticated" on public.holidays;
create policy "holidays_select_authenticated" on public.holidays
for select
using (auth.role() = 'authenticated');

drop policy if exists "holidays_manage_hr" on public.holidays;
create policy "holidays_manage_hr" on public.holidays
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop trigger if exists set_leave_policies_updated_at on public.leave_policies;
create trigger set_leave_policies_updated_at
before update on public.leave_policies
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_balances_updated_at on public.leave_balances;
create trigger set_leave_balances_updated_at
before update on public.leave_balances
for each row execute procedure public.set_updated_at();

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row execute procedure public.set_updated_at();

drop trigger if exists set_overtime_requests_updated_at on public.overtime_requests;
create trigger set_overtime_requests_updated_at
before update on public.overtime_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists set_holidays_updated_at on public.holidays;
create trigger set_holidays_updated_at
before update on public.holidays
for each row execute procedure public.set_updated_at();
