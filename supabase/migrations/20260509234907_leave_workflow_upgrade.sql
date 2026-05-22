alter table public.leave_policies
  add column if not exists monthly_accrual_rate numeric(8,2) not null default 0,
  add column if not exists reducing_balance boolean not null default true,
  add column if not exists carry_forward_enabled boolean not null default false,
  add column if not exists payroll_impact boolean not null default false,
  add column if not exists counts_toward_balance boolean not null default true,
  add column if not exists separate_tracking boolean not null default false,
  add column if not exists request_category text not null default 'leave';

alter table public.leave_requests
  add column if not exists request_category text not null default 'leave',
  add column if not exists expected_resume_date date,
  add column if not exists payroll_impact boolean not null default false,
  add column if not exists final_decision text,
  add column if not exists final_approved_by uuid references public.users(id) on delete set null,
  add column if not exists final_approved_at timestamptz,
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists idx_leave_requests_company_category
  on public.leave_requests(company_id, request_category, status, start_date desc);

create index if not exists idx_leave_policies_company_category
  on public.leave_policies(company_id, request_category, status);
