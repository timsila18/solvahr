create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  description text not null default '',
  billing_model text not null default 'flat',
  monthly_price numeric(12,2) not null default 0,
  annual_price numeric(12,2) not null default 0,
  price_per_employee numeric(12,2) not null default 0,
  currency text not null default 'KES',
  employee_limit integer,
  admin_limit integer,
  trial_days integer not null default 14,
  modules jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  add_ons jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null default 'trialing',
  billing_cycle text not null default 'monthly',
  currency text not null default 'KES',
  employee_count integer not null default 0,
  employee_limit integer,
  admin_count integer not null default 1,
  admin_limit integer,
  selected_modules jsonb not null default '[]'::jsonb,
  module_entitlements jsonb not null default '{}'::jsonb,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  renewal_date timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_status text not null default 'trial',
  payment_method text,
  mpesa_reference text,
  plan_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create table if not exists public.organization_onboarding (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  current_step text not null default 'company_profile',
  completed_steps jsonb not null default '[]'::jsonb,
  progress_percent integer not null default 0,
  launch_status text not null default 'setup',
  checklist jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id)
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  invoice_number text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'KES',
  status text not null default 'draft',
  invoice_date timestamptz not null default timezone('utc', now()),
  due_date timestamptz,
  paid_at timestamptz,
  receipt_number text,
  payment_method text,
  pdf_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'website',
  lead_type text not null default 'contact_sales',
  company_name text not null,
  contact_person text not null,
  email text not null,
  phone text,
  employee_count integer,
  modules jsonb not null default '[]'::jsonb,
  preferred_date timestamptz,
  country text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  snapshot_date date not null default current_date,
  employee_count integer not null default 0,
  admin_count integer not null default 0,
  payroll_runs integer not null default 0,
  report_exports integer not null default 0,
  generated_payslips integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, snapshot_date)
);

create index if not exists idx_org_subscriptions_company on public.organization_subscriptions(company_id);
create index if not exists idx_org_onboarding_company on public.organization_onboarding(company_id);
create index if not exists idx_billing_invoices_company on public.billing_invoices(company_id);
create index if not exists idx_sales_leads_status on public.sales_leads(status);
create index if not exists idx_usage_snapshots_company on public.usage_snapshots(company_id);

insert into public.subscription_plans (
  id, name, description, billing_model, monthly_price, annual_price, price_per_employee, currency,
  employee_limit, admin_limit, trial_days, modules, features, add_ons, status, sort_order
)
values
  (
    'starter',
    'Starter',
    'For growing teams that need core HR, ESS, and simple reporting.',
    'flat',
    12500,
    125000,
    0,
    'KES',
    25,
    2,
    14,
    '["dashboard","people","ess","reports"]'::jsonb,
    '["Core HR","ESS","Basic reports","Employee onboarding"]'::jsonb,
    '["Extra employees","Payroll add-on"]'::jsonb,
    'active',
    1
  ),
  (
    'growth',
    'Growth',
    'Payroll-ready plan for organizations running monthly HR and payroll operations.',
    'flat',
    28500,
    285000,
    0,
    'KES',
    100,
    5,
    21,
    '["dashboard","people","payroll","leave","ess","reports","administration"]'::jsonb,
    '["Payroll","Leave","Reports","Multi-admin","Branded exports"]'::jsonb,
    '["Additional admins","Training add-on","Recruitment add-on"]'::jsonb,
    'active',
    2
  ),
  (
    'business',
    'Business',
    'Full HRIS with approvals, branding, and deeper controls for multi-branch operations.',
    'per_employee',
    0,
    0,
    650,
    'KES',
    500,
    15,
    30,
    '["dashboard","people","payroll","leave","recruitment","performance","training","assets","ess","reports","administration","integrations"]'::jsonb,
    '["Full HRIS","Advanced approvals","Branded reports","Imports","Multi-branch setup"]'::jsonb,
    '["API access","Consultancy layer","Priority support"]'::jsonb,
    'active',
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'Unlimited usage with premium support and custom onboarding.',
    'custom',
    0,
    0,
    0,
    'KES',
    null,
    null,
    30,
    '["dashboard","people","payroll","leave","recruitment","performance","training","assets","ess","reports","administration","integrations","consultancy"]'::jsonb,
    '["Unlimited employees","Priority support","Custom onboarding","Advanced controls"]'::jsonb,
    '["Custom SLAs","Custom billing","API access"]'::jsonb,
    'active',
    4
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  billing_model = excluded.billing_model,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  price_per_employee = excluded.price_per_employee,
  currency = excluded.currency,
  employee_limit = excluded.employee_limit,
  admin_limit = excluded.admin_limit,
  trial_days = excluded.trial_days,
  modules = excluded.modules,
  features = excluded.features,
  add_ons = excluded.add_ons,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());
