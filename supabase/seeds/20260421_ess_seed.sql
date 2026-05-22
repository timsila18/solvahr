insert into public.ess_preferences (user_id, theme_mode, email_notifications, sms_notifications, in_app_notifications, language)
select
  u.id,
  case when row_number() over (order by u.created_at) % 2 = 0 then 'dark' else 'light' end,
  true,
  false,
  true,
  'en'
from public.users u
where u.employee_id is not null
on conflict (user_id) do update
set
  theme_mode = excluded.theme_mode,
  email_notifications = excluded.email_notifications,
  sms_notifications = excluded.sms_notifications,
  in_app_notifications = excluded.in_app_notifications,
  language = excluded.language,
  updated_at = timezone('utc', now());

insert into public.employee_loans (
  company_id,
  employee_id,
  loan_name,
  lender_name,
  deduction_type,
  original_amount,
  balance_amount,
  monthly_deduction,
  start_date,
  end_date,
  status,
  notes
)
select
  e.company_id,
  e.id,
  case when seq % 2 = 0 then 'Staff Car Loan' else 'Salary Advance' end,
  case when seq % 2 = 0 then 'Solva SACCO' else 'Internal HR Advance' end,
  case when seq % 2 = 0 then 'Loan' else 'Advance' end,
  450000 + (seq * 10000),
  180000 + (seq * 5000),
  25000 + (seq * 1500),
  date '2025-07-01' + (seq || ' days')::interval,
  date '2027-06-30' + (seq || ' days')::interval,
  'active',
  'Seeded ESS loan record'
from (
  select e.*, row_number() over (order by e.employee_number) as seq
  from public.employees e
  where e.employee_number in ('SOL-001','SOL-002','SOL-003','SOL-004','SOL-005','SOL-006','SOL-007','SOL-008','SOL-009','SOL-010')
) e
where not exists (
  select 1
  from public.employee_loans existing
  where existing.employee_id = e.id
);

insert into public.employee_assets (
  company_id,
  employee_id,
  asset_name,
  asset_category,
  serial_number,
  status,
  issue_date,
  expected_return_date,
  handover_form_name,
  notes
)
select
  e.company_id,
  e.id,
  case when seq % 2 = 0 then 'Dell Latitude Laptop' else 'Samsung Mobile Device' end,
  case when seq % 2 = 0 then 'Laptop' else 'Phone' end,
  'SOLVA-ASSET-' || lpad(seq::text, 4, '0'),
  'assigned',
  date '2026-01-10' + (seq || ' days')::interval,
  date '2027-01-10' + (seq || ' days')::interval,
  'handover-form-' || lpad(seq::text, 4, '0') || '.pdf',
  'Seeded asset assignment for ESS testing'
from (
  select e.*, row_number() over (order by e.employee_number) as seq
  from public.employees e
  where e.employee_number in ('SOL-001','SOL-002','SOL-003','SOL-004','SOL-005','SOL-006','SOL-007','SOL-008','SOL-009','SOL-010')
) e
where not exists (
  select 1
  from public.employee_assets existing
  where existing.employee_id = e.id
);

insert into public.performance_reviews (
  company_id,
  employee_id,
  review_cycle,
  review_period,
  score,
  status,
  supervisor_comments,
  hr_comments,
  promotion_recommendation,
  pip_status,
  goals,
  kpis
)
select
  e.company_id,
  e.id,
  '2026 Annual Cycle',
  '2026 Q1',
  3.2 + ((seq % 4) * 0.35),
  case when seq % 3 = 0 then 'completed' else 'in_review' end,
  'Supervisor notes for ' || e.employee_number,
  'HR notes aligned to development plan',
  case when seq % 4 = 0 then 'Watchlist for promotion' else 'No change' end,
  case when seq % 5 = 0 then 'Monitor' else 'Not on PIP' end,
  jsonb_build_array(
    jsonb_build_object('title', 'Service excellence', 'status', case when seq % 2 = 0 then 'On track' else 'Ahead' end),
    jsonb_build_object('title', 'Compliance quality', 'status', 'On track')
  ),
  jsonb_build_array(
    jsonb_build_object('label', 'KPI completion', 'value', 78 + seq),
    jsonb_build_object('label', 'Attendance discipline', 'value', 92 - seq)
  )
from (
  select e.*, row_number() over (order by e.employee_number) as seq
  from public.employees e
  where e.employee_number in ('SOL-001','SOL-002','SOL-003','SOL-004','SOL-005','SOL-006','SOL-007','SOL-008','SOL-009','SOL-010')
) e
where not exists (
  select 1
  from public.performance_reviews existing
  where existing.employee_id = e.id
    and existing.review_period = '2026 Q1'
);

insert into public.employee_p9_forms (
  company_id,
  employee_id,
  tax_year,
  gross_pay,
  taxable_pay,
  paye_paid,
  relief_applied,
  pension_contribution,
  insurance_relief,
  mortgage_relief,
  storage_bucket,
  storage_path
)
select
  e.company_id,
  e.id,
  2025,
  1200000 + (seq * 45000),
  1115000 + (seq * 42000),
  215000 + (seq * 8500),
  28800,
  72000,
  12000,
  0,
  'payroll-documents',
  'generated/p9-' || lower(e.employee_number) || '-2025.pdf'
from (
  select e.*, row_number() over (order by e.employee_number) as seq
  from public.employees e
  where e.employee_number in ('SOL-001','SOL-002','SOL-003','SOL-004','SOL-005','SOL-006','SOL-007','SOL-008','SOL-009','SOL-010')
) e
where not exists (
  select 1
  from public.employee_p9_forms existing
  where existing.employee_id = e.id
    and existing.tax_year = 2025
);
