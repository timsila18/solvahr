create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  color text not null default '#2563eb',
  is_paid boolean not null default true,
  requires_attachment boolean not null default false,
  gender_applicability text not null default 'all',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code),
  unique (company_id, name)
);

alter table public.leave_policies
  add column if not exists minimum_notice_days integer not null default 0,
  add column if not exists max_consecutive_days integer not null default 0,
  add column if not exists approval_flow text not null default 'supervisor_hr',
  add column if not exists unpaid_leave_handling text not null default 'deduct_in_payroll',
  add column if not exists probation_restriction boolean not null default false,
  add column if not exists gender_applicability text not null default 'all',
  add column if not exists employee_types jsonb not null default '[]'::jsonb,
  add column if not exists department_scope jsonb not null default '[]'::jsonb,
  add column if not exists branch_scope jsonb not null default '[]'::jsonb,
  add column if not exists job_grade_scope jsonb not null default '[]'::jsonb;

create table if not exists public.leave_approvals (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  approval_stage text not null,
  owner_role public.app_role not null,
  action text not null,
  comments text,
  acted_by uuid references public.users(id) on delete set null,
  acted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  category text not null default 'supporting_document',
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_accrual_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null,
  accrual_frequency text not null default 'monthly',
  accrual_rate numeric(8,2) not null default 0,
  max_accrual numeric(8,2),
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, leave_type)
);

create table if not exists public.leave_carry_forward_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null,
  carry_forward_limit numeric(8,2) not null default 0,
  expiry_month integer,
  expiry_day integer,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, leave_type)
);

create table if not exists public.leave_encashment_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null,
  max_encashable_days numeric(8,2) not null default 0,
  minimum_balance_after numeric(8,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, leave_type)
);

create table if not exists public.holiday_calendars (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  is_default boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, name)
);

create table if not exists public.weekend_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  working_days jsonb not null default '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  half_days jsonb not null default '[]'::jsonb,
  effective_from date default current_date,
  effective_to date,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_blackout_dates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_delegations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_request_id uuid references public.leave_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  delegate_employee_id uuid not null references public.employees(id) on delete cascade,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  device_name text not null,
  device_code text not null,
  device_type text not null default 'biometric',
  status text not null default 'active',
  last_sync_at timestamptz,
  api_endpoint text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, device_code)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 60,
  overtime_eligible boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, code)
);

create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  effective_from date not null,
  effective_to date,
  pattern text not null default 'weekly',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  total_hours numeric(8,2) not null default 0,
  status text not null default 'draft',
  notes text,
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  submitted_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, week_start)
);

create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  work_date date not null,
  hours numeric(8,2) not null default 0,
  project_name text,
  task_name text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.overtime_approvals (
  id uuid primary key default gen_random_uuid(),
  overtime_request_id uuid not null references public.overtime_requests(id) on delete cascade,
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  approval_stage text not null,
  owner_role public.app_role not null,
  action text not null,
  comments text,
  acted_by uuid references public.users(id) on delete set null,
  acted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lateness_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  grace_minutes integer not null default 0,
  warning_threshold integer not null default 3,
  payroll_action text not null default 'summary_only',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lateness_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_record_id uuid references public.attendance_records(id) on delete cascade,
  rule_id uuid references public.lateness_rules(id) on delete set null,
  work_date date not null,
  minutes_late integer not null default 0,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.absenteeism_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  work_date date not null,
  absence_type text not null default 'unexcused',
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  work_date date not null,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  reason text not null,
  status text not null default 'pending',
  approval_task_id uuid references public.approval_tasks(id) on delete set null,
  requested_by uuid references public.users(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_record_id uuid references public.attendance_records(id) on delete set null,
  work_date date not null,
  exception_type text not null,
  severity text not null default 'warning',
  status text not null default 'open',
  notes text,
  payroll_relevant boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.geofence_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_meters integer not null default 100,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.biometric_sync_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid references public.attendance_devices(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  status text not null default 'queued',
  message text,
  records_synced integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_leave_types_company on public.leave_types(company_id, status);
create index if not exists idx_leave_attachments_request on public.leave_attachments(leave_request_id);
create index if not exists idx_leave_blackout_dates_company on public.leave_blackout_dates(company_id, start_date);
create index if not exists idx_attendance_devices_company on public.attendance_devices(company_id, status);
create index if not exists idx_timesheets_employee_week on public.timesheets(employee_id, week_start desc);
create index if not exists idx_shift_assignments_employee on public.shift_assignments(employee_id, effective_from desc);
create index if not exists idx_lateness_records_employee on public.lateness_records(employee_id, work_date desc);
create index if not exists idx_absenteeism_records_employee on public.absenteeism_records(employee_id, work_date desc);
create index if not exists idx_attendance_adjustments_employee on public.attendance_adjustments(employee_id, work_date desc);
create index if not exists idx_attendance_exceptions_employee on public.attendance_exceptions(employee_id, work_date desc);

alter table public.leave_types enable row level security;
alter table public.leave_approvals enable row level security;
alter table public.leave_attachments enable row level security;
alter table public.leave_accrual_rules enable row level security;
alter table public.leave_carry_forward_rules enable row level security;
alter table public.leave_encashment_rules enable row level security;
alter table public.holiday_calendars enable row level security;
alter table public.weekend_rules enable row level security;
alter table public.leave_blackout_dates enable row level security;
alter table public.leave_delegations enable row level security;
alter table public.attendance_devices enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.overtime_approvals enable row level security;
alter table public.lateness_rules enable row level security;
alter table public.lateness_records enable row level security;
alter table public.absenteeism_records enable row level security;
alter table public.attendance_adjustments enable row level security;
alter table public.attendance_exceptions enable row level security;
alter table public.geofence_settings enable row level security;
alter table public.biometric_sync_logs enable row level security;

drop policy if exists "leave_types_select_authenticated" on public.leave_types;
create policy "leave_types_select_authenticated" on public.leave_types
for select using (auth.role() = 'authenticated');

drop policy if exists "leave_types_manage_hr" on public.leave_types;
create policy "leave_types_manage_hr" on public.leave_types
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_approvals_select_scoped" on public.leave_approvals;
create policy "leave_approvals_select_scoped" on public.leave_approvals
for select using (
  public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin','Auditor']::public.app_role[])
  or exists (
    select 1
    from public.leave_requests request
    where request.id = leave_request_id
      and public.can_access_employee(request.employee_id)
  )
);

drop policy if exists "leave_approvals_manage_owner" on public.leave_approvals;
create policy "leave_approvals_manage_owner" on public.leave_approvals
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "leave_attachments_select_scoped" on public.leave_attachments;
create policy "leave_attachments_select_scoped" on public.leave_attachments
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "leave_attachments_manage_scoped" on public.leave_attachments;
create policy "leave_attachments_manage_scoped" on public.leave_attachments
for all
using (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Operator']::public.app_role[]))
with check (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Operator']::public.app_role[]));

drop policy if exists "leave_rules_select_authenticated" on public.leave_accrual_rules;
create policy "leave_rules_select_authenticated" on public.leave_accrual_rules
for select using (auth.role() = 'authenticated');

drop policy if exists "leave_rules_manage_hr" on public.leave_accrual_rules;
create policy "leave_rules_manage_hr" on public.leave_accrual_rules
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_carry_forward_select_authenticated" on public.leave_carry_forward_rules;
create policy "leave_carry_forward_select_authenticated" on public.leave_carry_forward_rules
for select using (auth.role() = 'authenticated');

drop policy if exists "leave_carry_forward_manage_hr" on public.leave_carry_forward_rules;
create policy "leave_carry_forward_manage_hr" on public.leave_carry_forward_rules
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_encashment_select_authenticated" on public.leave_encashment_rules;
create policy "leave_encashment_select_authenticated" on public.leave_encashment_rules
for select using (auth.role() = 'authenticated');

drop policy if exists "leave_encashment_manage_hr" on public.leave_encashment_rules;
create policy "leave_encashment_manage_hr" on public.leave_encashment_rules
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "holiday_calendars_select_authenticated" on public.holiday_calendars;
create policy "holiday_calendars_select_authenticated" on public.holiday_calendars
for select using (auth.role() = 'authenticated');

drop policy if exists "holiday_calendars_manage_hr" on public.holiday_calendars;
create policy "holiday_calendars_manage_hr" on public.holiday_calendars
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "weekend_rules_select_authenticated" on public.weekend_rules;
create policy "weekend_rules_select_authenticated" on public.weekend_rules
for select using (auth.role() = 'authenticated');

drop policy if exists "weekend_rules_manage_hr" on public.weekend_rules;
create policy "weekend_rules_manage_hr" on public.weekend_rules
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_blackout_dates_select_authenticated" on public.leave_blackout_dates;
create policy "leave_blackout_dates_select_authenticated" on public.leave_blackout_dates
for select using (auth.role() = 'authenticated');

drop policy if exists "leave_blackout_dates_manage_hr" on public.leave_blackout_dates;
create policy "leave_blackout_dates_manage_hr" on public.leave_blackout_dates
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "leave_delegations_select_scoped" on public.leave_delegations;
create policy "leave_delegations_select_scoped" on public.leave_delegations
for select using (public.can_access_employee(employee_id) or public.can_access_employee(delegate_employee_id));

drop policy if exists "leave_delegations_manage_scoped" on public.leave_delegations;
create policy "leave_delegations_manage_scoped" on public.leave_delegations
for all
using (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "attendance_devices_select_hr" on public.attendance_devices;
create policy "attendance_devices_select_hr" on public.attendance_devices
for select using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "attendance_devices_manage_hr" on public.attendance_devices;
create policy "attendance_devices_manage_hr" on public.attendance_devices
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "shifts_select_authenticated" on public.shifts;
create policy "shifts_select_authenticated" on public.shifts
for select using (auth.role() = 'authenticated');

drop policy if exists "shifts_manage_hr" on public.shifts;
create policy "shifts_manage_hr" on public.shifts
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "shift_assignments_select_scoped" on public.shift_assignments;
create policy "shift_assignments_select_scoped" on public.shift_assignments
for select using (
  employee_id is null
  or public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin','Auditor']::public.app_role[])
);

drop policy if exists "shift_assignments_manage_hr" on public.shift_assignments;
create policy "shift_assignments_manage_hr" on public.shift_assignments
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "timesheets_select_scoped" on public.timesheets;
create policy "timesheets_select_scoped" on public.timesheets
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "timesheets_manage_scoped" on public.timesheets;
create policy "timesheets_manage_scoped" on public.timesheets
for all
using (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "timesheet_entries_select_scoped" on public.timesheet_entries;
create policy "timesheet_entries_select_scoped" on public.timesheet_entries
for select using (
  exists (
    select 1 from public.timesheets sheet
    where sheet.id = timesheet_id
      and (public.can_access_employee(sheet.employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]))
  )
);

drop policy if exists "timesheet_entries_manage_scoped" on public.timesheet_entries;
create policy "timesheet_entries_manage_scoped" on public.timesheet_entries
for all
using (
  exists (
    select 1 from public.timesheets sheet
    where sheet.id = timesheet_id
      and (public.can_access_employee(sheet.employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
  )
)
with check (
  exists (
    select 1 from public.timesheets sheet
    where sheet.id = timesheet_id
      and (public.can_access_employee(sheet.employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
  )
);

drop policy if exists "overtime_approvals_select_scoped" on public.overtime_approvals;
create policy "overtime_approvals_select_scoped" on public.overtime_approvals
for select using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "overtime_approvals_manage_scoped" on public.overtime_approvals;
create policy "overtime_approvals_manage_scoped" on public.overtime_approvals
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[]));

drop policy if exists "lateness_rules_select_authenticated" on public.lateness_rules;
create policy "lateness_rules_select_authenticated" on public.lateness_rules
for select using (auth.role() = 'authenticated');

drop policy if exists "lateness_rules_manage_hr" on public.lateness_rules;
create policy "lateness_rules_manage_hr" on public.lateness_rules
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "lateness_records_select_scoped" on public.lateness_records;
create policy "lateness_records_select_scoped" on public.lateness_records
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "lateness_records_manage_hr" on public.lateness_records;
create policy "lateness_records_manage_hr" on public.lateness_records
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "absenteeism_records_select_scoped" on public.absenteeism_records;
create policy "absenteeism_records_select_scoped" on public.absenteeism_records
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "absenteeism_records_manage_hr" on public.absenteeism_records;
create policy "absenteeism_records_manage_hr" on public.absenteeism_records
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "attendance_adjustments_select_scoped" on public.attendance_adjustments;
create policy "attendance_adjustments_select_scoped" on public.attendance_adjustments
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "attendance_adjustments_manage_scoped" on public.attendance_adjustments;
create policy "attendance_adjustments_manage_scoped" on public.attendance_adjustments
for all
using (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]))
with check (public.can_access_employee(employee_id) or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "attendance_exceptions_select_scoped" on public.attendance_exceptions;
create policy "attendance_exceptions_select_scoped" on public.attendance_exceptions
for select using (public.can_access_employee(employee_id) or public.has_role(array['Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "attendance_exceptions_manage_hr" on public.attendance_exceptions;
create policy "attendance_exceptions_manage_hr" on public.attendance_exceptions
for all
using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin']::public.app_role[]));

drop policy if exists "geofence_settings_select_hr" on public.geofence_settings;
create policy "geofence_settings_select_hr" on public.geofence_settings
for select using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[]));

drop policy if exists "geofence_settings_manage_hr" on public.geofence_settings;
create policy "geofence_settings_manage_hr" on public.geofence_settings
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop policy if exists "biometric_sync_logs_select_hr" on public.biometric_sync_logs;
create policy "biometric_sync_logs_select_hr" on public.biometric_sync_logs
for select using (public.has_role(array['Super Admin','HR Admin','Manager','Supervisor','Payroll Admin','Auditor']::public.app_role[]));

drop policy if exists "biometric_sync_logs_manage_hr" on public.biometric_sync_logs;
create policy "biometric_sync_logs_manage_hr" on public.biometric_sync_logs
for all
using (public.has_role(array['Super Admin','HR Admin']::public.app_role[]))
with check (public.has_role(array['Super Admin','HR Admin']::public.app_role[]));

drop trigger if exists set_leave_types_updated_at on public.leave_types;
create trigger set_leave_types_updated_at before update on public.leave_types
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_accrual_rules_updated_at on public.leave_accrual_rules;
create trigger set_leave_accrual_rules_updated_at before update on public.leave_accrual_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_carry_forward_rules_updated_at on public.leave_carry_forward_rules;
create trigger set_leave_carry_forward_rules_updated_at before update on public.leave_carry_forward_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_encashment_rules_updated_at on public.leave_encashment_rules;
create trigger set_leave_encashment_rules_updated_at before update on public.leave_encashment_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists set_holiday_calendars_updated_at on public.holiday_calendars;
create trigger set_holiday_calendars_updated_at before update on public.holiday_calendars
for each row execute procedure public.set_updated_at();

drop trigger if exists set_weekend_rules_updated_at on public.weekend_rules;
create trigger set_weekend_rules_updated_at before update on public.weekend_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_blackout_dates_updated_at on public.leave_blackout_dates;
create trigger set_leave_blackout_dates_updated_at before update on public.leave_blackout_dates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leave_delegations_updated_at on public.leave_delegations;
create trigger set_leave_delegations_updated_at before update on public.leave_delegations
for each row execute procedure public.set_updated_at();

drop trigger if exists set_attendance_devices_updated_at on public.attendance_devices;
create trigger set_attendance_devices_updated_at before update on public.attendance_devices
for each row execute procedure public.set_updated_at();

drop trigger if exists set_shifts_updated_at on public.shifts;
create trigger set_shifts_updated_at before update on public.shifts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_shift_assignments_updated_at on public.shift_assignments;
create trigger set_shift_assignments_updated_at before update on public.shift_assignments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_timesheets_updated_at on public.timesheets;
create trigger set_timesheets_updated_at before update on public.timesheets
for each row execute procedure public.set_updated_at();

drop trigger if exists set_lateness_rules_updated_at on public.lateness_rules;
create trigger set_lateness_rules_updated_at before update on public.lateness_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists set_lateness_records_updated_at on public.lateness_records;
create trigger set_lateness_records_updated_at before update on public.lateness_records
for each row execute procedure public.set_updated_at();

drop trigger if exists set_absenteeism_records_updated_at on public.absenteeism_records;
create trigger set_absenteeism_records_updated_at before update on public.absenteeism_records
for each row execute procedure public.set_updated_at();

drop trigger if exists set_attendance_adjustments_updated_at on public.attendance_adjustments;
create trigger set_attendance_adjustments_updated_at before update on public.attendance_adjustments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_attendance_exceptions_updated_at on public.attendance_exceptions;
create trigger set_attendance_exceptions_updated_at before update on public.attendance_exceptions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_geofence_settings_updated_at on public.geofence_settings;
create trigger set_geofence_settings_updated_at before update on public.geofence_settings
for each row execute procedure public.set_updated_at();
