create table if not exists public.company_referrals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  referred_company_name text not null,
  contact_person text not null,
  contact_email text,
  contact_phone text,
  industry text,
  notes text,
  reward_type text default 'free_month',
  reward_value text,
  status text not null default 'new',
  source text not null default 'internal_referral',
  created_by_user_id uuid references public.users(id) on delete set null,
  created_by_role text,
  converted_lead_id uuid references public.sales_leads(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_company_referrals_company on public.company_referrals(company_id);
create index if not exists idx_company_referrals_status on public.company_referrals(status);
create index if not exists idx_company_referrals_created_at on public.company_referrals(created_at desc);
