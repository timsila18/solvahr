insert into public.companies (id, name, slug, status)
values ('11111111-1111-1111-1111-111111111111', 'Solva Demo Manufacturing', 'solva-demo-manufacturing', 'active')
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status;

insert into public.branches (company_id, code, name, location, status)
values
  ('11111111-1111-1111-1111-111111111111', 'NAI', 'Nairobi HQ', 'Nairobi', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'MSA', 'Mombasa Branch', 'Mombasa', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'KSM', 'Kisumu Branch', 'Kisumu', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'NKR', 'Nakuru Branch', 'Nakuru', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'FLD', 'Field Operations', 'Regional', 'active')
on conflict (company_id, code) do update
set
  name = excluded.name,
  location = excluded.location,
  status = excluded.status;

insert into public.departments (company_id, branch_id, code, name, status)
select
  '11111111-1111-1111-1111-111111111111',
  branch_map.branch_id,
  source.code,
  source.name,
  'active'
from (
  values
    ('HR', 'People Operations', 'NAI'),
    ('FIN', 'Finance', 'NAI'),
    ('OPS', 'Operations', 'MSA'),
    ('DST', 'Distribution', 'MSA'),
    ('COM', 'Commercial', 'NAI'),
    ('TRN', 'Training', 'NAI'),
    ('AST', 'Assets and Admin', 'KSM'),
    ('REC', 'Recruitment', 'NAI')
) as source(code, name, branch_code)
join (
  select id as branch_id, code
  from public.branches
  where company_id = '11111111-1111-1111-1111-111111111111'
) as branch_map
  on branch_map.code = source.branch_code
on conflict (company_id, code) do update
set
  name = excluded.name,
  branch_id = excluded.branch_id,
  status = excluded.status;

insert into public.designations (company_id, code, title, status)
values
  ('11111111-1111-1111-1111-111111111111', 'HRA', 'HR Administrator', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'PYA', 'Payroll Administrator', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'MGR', 'Line Manager', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'REC', 'Recruiter', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'OFF', 'Operations Officer', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'AST', 'Assets Officer', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'EMP', 'Employee', 'active')
on conflict (company_id, code) do update
set
  title = excluded.title,
  status = excluded.status;

insert into public.job_grades (company_id, code, name, level_rank, status)
values
  ('11111111-1111-1111-1111-111111111111', 'G1', 'Executive', 1, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'G2', 'Management', 2, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'G3', 'Senior Staff', 3, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'G4', 'Professional', 4, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'G5', 'Support', 5, 'active')
on conflict (company_id, code) do update
set
  name = excluded.name,
  level_rank = excluded.level_rank,
  status = excluded.status;

insert into public.payroll_groups (company_id, name, frequency, currency, cut_off_day, pay_day, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Monthly Core', 'Monthly', 'KES', 25, 28, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Half Month Management', 'Half Month', 'KES', 15, 15, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Weekly Casuals', 'Weekly', 'KES', 6, 7, 'active')
on conflict (company_id, name) do update
set
  frequency = excluded.frequency,
  currency = excluded.currency,
  cut_off_day = excluded.cut_off_day,
  pay_day = excluded.pay_day,
  status = excluded.status;

with
branch_rows as (
  select row_number() over (order by code) as rn, id
  from public.branches
  where company_id = '11111111-1111-1111-1111-111111111111'
),
department_rows as (
  select row_number() over (order by code) as rn, id
  from public.departments
  where company_id = '11111111-1111-1111-1111-111111111111'
),
designation_rows as (
  select row_number() over (order by code) as rn, id
  from public.designations
  where company_id = '11111111-1111-1111-1111-111111111111'
),
grade_rows as (
  select row_number() over (order by code) as rn, id
  from public.job_grades
  where company_id = '11111111-1111-1111-1111-111111111111'
),
payroll_group_rows as (
  select row_number() over (order by name) as rn, id
  from public.payroll_groups
  where company_id = '11111111-1111-1111-1111-111111111111'
),
seed_source as (
  select
    gs as seq,
    'SOL-' || lpad(gs::text, 3, '0') as employee_number,
    (array['Amina','Brian','Mercy','Daniel','Lucy','Kevin','Grace','David','Faith','Peter'])[((gs - 1) % 10) + 1] as first_name,
    (array['Otieno','Mwangi','Njeri','Oloo','Atieno','Karanja','Wambui','Kamau','Achieng','Mutiso'])[(((gs - 1) / 10) % 10) + 1] as last_name,
    ((gs - 1) % 5) + 1 as branch_idx,
    ((gs - 1) % 8) + 1 as department_idx,
    case when gs <= 10 then 3 when gs <= 20 then 2 when gs <= 60 then 4 else 7 end as designation_idx,
    case when gs <= 5 then 2 when gs <= 20 then 3 when gs <= 70 then 4 else 5 end as grade_idx,
    case when gs <= 15 then 2 when gs > 85 then 3 else 1 end as payroll_group_idx,
    case when gs <= 5 then 'Manager' when gs <= 15 then 'Supervisor' else 'Active' end as status_value
  from generate_series(1, 100) as gs
)
insert into public.employees (
  company_id,
  employee_number,
  first_name,
  last_name,
  national_id,
  kra_pin,
  shif_number,
  nssf_number,
  gender,
  date_of_birth,
  phone,
  email,
  employment_type,
  department_id,
  branch_id,
  designation_id,
  job_grade_id,
  hire_date,
  confirmation_date,
  contract_end_date,
  payroll_group_id,
  bank_name,
  bank_branch,
  bank_account,
  salary,
  status,
  next_of_kin,
  emergency_contact
)
select
  '11111111-1111-1111-1111-111111111111',
  source.employee_number,
  source.first_name,
  source.last_name,
  'ID' || lpad(source.seq::text, 8, '0'),
  'A' || lpad(source.seq::text, 9, '0') || 'K',
  'SHIF-' || lpad(source.seq::text, 6, '0'),
  'NSSF-' || lpad(source.seq::text, 6, '0'),
  case when source.seq % 2 = 0 then 'Female' else 'Male' end,
  date '1984-01-01' + (source.seq * interval '70 days'),
  '07' || lpad((70000000 + source.seq)::text, 8, '0'),
  lower(source.first_name || '.' || source.last_name || source.seq || '@solvahr.app'),
  case when source.seq > 85 then 'Casual' when source.seq > 70 then 'Contract' else 'Permanent' end,
  department_rows.id,
  branch_rows.id,
  designation_rows.id,
  grade_rows.id,
  date '2021-01-01' + (source.seq * interval '10 days'),
  date '2021-07-01' + (source.seq * interval '10 days'),
  case when source.seq > 70 then date '2026-12-31' else null end,
  payroll_group_rows.id,
  (array['KCB Bank','Equity Bank','Co-operative Bank','Absa Bank'])[((source.seq - 1) % 4) + 1],
  (array['Kenyatta Avenue','Moi Avenue','Kimathi Street','Westlands'])[((source.seq - 1) % 4) + 1],
  lpad((1000000000 + source.seq)::text, 10, '0'),
  (75000 + (source.seq * 1450))::numeric(14,2),
  source.status_value,
  jsonb_build_object('name', 'Next of Kin ' || source.seq, 'phone', '07' || lpad((71100000 + source.seq)::text, 8, '0')),
  jsonb_build_object('name', 'Emergency Contact ' || source.seq, 'phone', '07' || lpad((72200000 + source.seq)::text, 8, '0'))
from seed_source as source
join branch_rows on branch_rows.rn = source.branch_idx
join department_rows on department_rows.rn = source.department_idx
join designation_rows on designation_rows.rn = source.designation_idx
join grade_rows on grade_rows.rn = source.grade_idx
join payroll_group_rows on payroll_group_rows.rn = source.payroll_group_idx
on conflict (employee_number) do nothing;

update public.employees
set supervisor_employee_id = supervisors.id
from (
  select id, row_number() over (order by employee_number) as rn
  from public.employees
  where company_id = '11111111-1111-1111-1111-111111111111'
) as staff
join (
  select id, row_number() over (order by employee_number) as rn
  from public.employees
  where company_id = '11111111-1111-1111-1111-111111111111'
    and status in ('Manager', 'Supervisor')
) as supervisors
  on supervisors.rn = ((staff.rn - 1) % 15) + 1
where public.employees.id = staff.id
  and public.employees.supervisor_employee_id is null
  and public.employees.status = 'Active';

insert into public.payroll_runs (
  company_id,
  period_label,
  payroll_type,
  status,
  processed_at,
  gross_pay,
  net_pay,
  total_deductions,
  employer_cost,
  paye_total,
  shif_total,
  housing_levy_total,
  nssf_total,
  pension_total,
  validation_errors
)
values
  ('11111111-1111-1111-1111-111111111111', 'Apr 2026', 'Full Month', 'Pending approval', timezone('utc', now()), 18450000, 13940000, 4510000, 19770000, 2480000, 507375, 276750, 1127520, 442500, 7),
  ('11111111-1111-1111-1111-111111111111', 'Mar 2026', 'Full Month', 'Closed', timezone('utc', now()) - interval '30 days', 18200000, 13710000, 4490000, 19530000, 2432000, 500500, 273000, 1114200, 437000, 0)
on conflict do nothing;

insert into public.payroll_employees (
  payroll_run_id,
  employee_id,
  basic_salary,
  allowances,
  deductions,
  gross_pay,
  net_pay,
  status
)
select
  payroll_run.id,
  employee.id,
  employee.salary,
  jsonb_build_object(
    'house_allowance', round(employee.salary * 0.12, 2),
    'commuter_allowance', 8000,
    'airtime_allowance', 2500
  ),
  jsonb_build_object(
    'paye', round(employee.salary * 0.18, 2),
    'shif', round((employee.salary + 10500) * 0.0275, 2),
    'nssf', 1080,
    'housing_levy', round((employee.salary + 10500) * 0.015, 2)
  ),
  round(employee.salary + 10500, 2),
  round((employee.salary + 10500) - ((employee.salary * 0.18) + ((employee.salary + 10500) * 0.0275) + 1080 + ((employee.salary + 10500) * 0.015)), 2),
  case when employee.employee_number in ('SOL-067', 'SOL-094') then 'Validation error' else 'Ready' end
from public.employees as employee
cross join lateral (
  select id
  from public.payroll_runs
  where company_id = '11111111-1111-1111-1111-111111111111'
    and period_label = 'Apr 2026'
  limit 1
) as payroll_run
on conflict (payroll_run_id, employee_id) do nothing;
