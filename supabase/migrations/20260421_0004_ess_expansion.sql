create table if not exists public.ess_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  theme_mode text not null default 'light',
  email_notifications boolean not null default true,
  sms_notifications boolean not null default false,
  in_app_notifications boolean not null default true,
  language text not null default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  loan_name text not null,
  lender_name text,
  deduction_type text not null default 'Loan',
  original_amount numeric(14,2) not null default 0,
  balance_amount numeric(14,2) not null default 0,
  monthly_deduction numeric(14,2) not null default 0,
  start_date date,
  end_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  asset_name text not null,
  asset_category text not null default 'General',
  serial_number text,
  status text not null default 'assigned',
  issue_date date,
  expected_return_date date,
  handover_form_name text,
  handover_form_bucket text,
  handover_form_path text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  review_cycle text not null,
  review_period text not null,
  score numeric(5,2) not null default 0,
  status text not null default 'pending',
  supervisor_comments text,
  hr_comments text,
  promotion_recommendation text,
  pip_status text,
  goals jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_p9_forms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  tax_year integer not null,
  gross_pay numeric(14,2) not null default 0,
  taxable_pay numeric(14,2) not null default 0,
  paye_paid numeric(14,2) not null default 0,
  relief_applied numeric(14,2) not null default 0,
  pension_contribution numeric(14,2) not null default 0,
  insurance_relief numeric(14,2) not null default 0,
  mortgage_relief numeric(14,2) not null default 0,
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, tax_year)
);

create index if not exists idx_ess_preferences_user on public.ess_preferences(user_id);
create index if not exists idx_employee_loans_employee on public.employee_loans(employee_id, status);
create index if not exists idx_employee_assets_employee on public.employee_assets(employee_id, status);
create index if not exists idx_performance_reviews_employee on public.performance_reviews(employee_id, review_period desc);
create index if not exists idx_employee_p9_forms_employee on public.employee_p9_forms(employee_id, tax_year desc);

alter table public.ess_preferences enable row level security;
alter table public.employee_loans enable row level security;
alter table public.employee_assets enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.employee_p9_forms enable row level security;

drop policy if exists "ess_preferences_select_self" on public.ess_preferences;
create policy "ess_preferences_select_self" on public.ess_preferences
for select
using (
  user_id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin','Auditor']::public.app_role[])
);

drop policy if exists "ess_preferences_manage_self" on public.ess_preferences;
create policy "ess_preferences_manage_self" on public.ess_preferences
for all
using (
  user_id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin']::public.app_role[])
)
with check (
  user_id = auth.uid()
  or public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

drop policy if exists "employee_loans_select_scoped" on public.employee_loans;
create policy "employee_loans_select_scoped" on public.employee_loans
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "employee_loans_manage_payroll" on public.employee_loans;
create policy "employee_loans_manage_payroll" on public.employee_loans
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','Payroll Admin','Finance Officer','HR Admin']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','Payroll Admin','Finance Officer','HR Admin']::public.app_role[])
);

drop policy if exists "employee_assets_select_scoped" on public.employee_assets;
create policy "employee_assets_select_scoped" on public.employee_assets
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Auditor']::public.app_role[])
);

drop policy if exists "employee_assets_manage_scoped" on public.employee_assets;
create policy "employee_assets_manage_scoped" on public.employee_assets
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Operator','Supervisor']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Operator','Supervisor']::public.app_role[])
);

drop policy if exists "performance_reviews_select_scoped" on public.performance_reviews;
create policy "performance_reviews_select_scoped" on public.performance_reviews
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Auditor']::public.app_role[])
);

drop policy if exists "performance_reviews_manage_hr" on public.performance_reviews;
create policy "performance_reviews_manage_hr" on public.performance_reviews
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
);

drop policy if exists "employee_p9_forms_select_scoped" on public.employee_p9_forms;
create policy "employee_p9_forms_select_scoped" on public.employee_p9_forms
for select
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "employee_p9_forms_manage_payroll" on public.employee_p9_forms;
create policy "employee_p9_forms_manage_payroll" on public.employee_p9_forms
for all
using (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
)
with check (
  public.can_access_employee(employee_id)
  or public.has_role(array['Super Admin','Payroll Admin','Finance Officer']::public.app_role[])
);

drop trigger if exists set_ess_preferences_updated_at on public.ess_preferences;
create trigger set_ess_preferences_updated_at
before update on public.ess_preferences
for each row execute procedure public.set_updated_at();

drop trigger if exists set_employee_loans_updated_at on public.employee_loans;
create trigger set_employee_loans_updated_at
before update on public.employee_loans
for each row execute procedure public.set_updated_at();

drop trigger if exists set_employee_assets_updated_at on public.employee_assets;
create trigger set_employee_assets_updated_at
before update on public.employee_assets
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_reviews_updated_at on public.performance_reviews;
create trigger set_performance_reviews_updated_at
before update on public.performance_reviews
for each row execute procedure public.set_updated_at();

drop trigger if exists set_employee_p9_forms_updated_at on public.employee_p9_forms;
create trigger set_employee_p9_forms_updated_at
before update on public.employee_p9_forms
for each row execute procedure public.set_updated_at();
