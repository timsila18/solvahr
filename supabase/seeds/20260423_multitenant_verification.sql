insert into public.companies (id, name, slug, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Northwind Logistics Ltd', 'northwind-logistics', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Bluewave Consulting Ltd', 'bluewave-consulting', 'active')
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status;

insert into public.company_settings (
  company_id,
  primary_email,
  phone,
  physical_address,
  default_currency,
  country,
  timezone,
  branding
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'finance@northwind.example',
    '+254700100100',
    'Mombasa Road, Nairobi',
    'KES',
    'Kenya',
    'Africa/Nairobi',
    jsonb_build_object(
      'displayName', 'Northwind Logistics Ltd',
      'employerIdentifier', 'NWL',
      'reportFooter', 'Powered by Solva HR',
      'accentColor', '#1d4ed8',
      'logoMark', 'NL'
    )
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'finance@bluewave.example',
    '+254700200200',
    'Westlands Office Park, Nairobi',
    'KES',
    'Kenya',
    'Africa/Nairobi',
    jsonb_build_object(
      'displayName', 'Bluewave Consulting Ltd',
      'employerIdentifier', 'BWC',
      'reportFooter', 'Powered by Solva HR',
      'accentColor', '#0f766e',
      'logoMark', 'BC'
    )
  )
on conflict (company_id) do update
set
  primary_email = excluded.primary_email,
  phone = excluded.phone,
  physical_address = excluded.physical_address,
  default_currency = excluded.default_currency,
  country = excluded.country,
  timezone = excluded.timezone,
  branding = public.company_settings.branding || excluded.branding;

insert into public.branches (company_id, code, name, location, status)
values
  ('22222222-2222-2222-2222-222222222222', 'BWN', 'Bluewave HQ', 'Westlands', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'BWM', 'Bluewave Coast Office', 'Mombasa', 'active')
on conflict (company_id, code) do update
set
  name = excluded.name,
  location = excluded.location,
  status = excluded.status;

insert into public.departments (company_id, branch_id, code, name, status)
select
  '22222222-2222-2222-2222-222222222222',
  branch_rows.id,
  source.code,
  source.name,
  'active'
from (
  values
    ('FIN', 'Finance', 'BWN'),
    ('OPS', 'Operations', 'BWN'),
    ('PEO', 'People and Culture', 'BWM')
) as source(code, name, branch_code)
join (
  select id, code
  from public.branches
  where company_id = '22222222-2222-2222-2222-222222222222'
) as branch_rows
  on branch_rows.code = source.branch_code
on conflict (company_id, code) do update
set
  name = excluded.name,
  branch_id = excluded.branch_id,
  status = excluded.status;

insert into public.designations (company_id, code, title, status)
values
  ('22222222-2222-2222-2222-222222222222', 'BPA', 'Payroll Administrator', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'BHR', 'HR Administrator', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'BCN', 'Consultant', 'active')
on conflict (company_id, code) do update
set
  title = excluded.title,
  status = excluded.status;

insert into public.job_grades (company_id, code, name, level_rank, status)
values
  ('22222222-2222-2222-2222-222222222222', 'BG1', 'Management', 2, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'BG2', 'Professional', 4, 'active')
on conflict (company_id, code) do update
set
  name = excluded.name,
  level_rank = excluded.level_rank,
  status = excluded.status;

insert into public.payroll_groups (company_id, name, frequency, currency, cut_off_day, pay_day, status)
values
  ('22222222-2222-2222-2222-222222222222', 'Bluewave Monthly', 'Monthly', 'KES', 25, 28, 'active')
on conflict (company_id, name) do update
set
  frequency = excluded.frequency,
  currency = excluded.currency,
  cut_off_day = excluded.cut_off_day,
  pay_day = excluded.pay_day,
  status = excluded.status;

with refs as (
  select
    (select id from public.branches where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BWN') as branch_hq,
    (select id from public.branches where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BWM') as branch_coast,
    (select id from public.departments where company_id = '22222222-2222-2222-2222-222222222222' and code = 'FIN') as dept_fin,
    (select id from public.departments where company_id = '22222222-2222-2222-2222-222222222222' and code = 'OPS') as dept_ops,
    (select id from public.departments where company_id = '22222222-2222-2222-2222-222222222222' and code = 'PEO') as dept_people,
    (select id from public.designations where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BPA') as des_payroll,
    (select id from public.designations where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BHR') as des_hr,
    (select id from public.designations where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BCN') as des_consultant,
    (select id from public.job_grades where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BG1') as grade_mgmt,
    (select id from public.job_grades where company_id = '22222222-2222-2222-2222-222222222222' and code = 'BG2') as grade_prof,
    (select id from public.payroll_groups where company_id = '22222222-2222-2222-2222-222222222222' and name = 'Bluewave Monthly') as payroll_group_id
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
  '22222222-2222-2222-2222-222222222222',
  src.employee_number,
  src.first_name,
  src.last_name,
  src.national_id,
  src.kra_pin,
  src.shif_number,
  src.nssf_number,
  src.gender,
  src.date_of_birth,
  src.phone,
  src.email,
  src.employment_type,
  src.department_id,
  src.branch_id,
  src.designation_id,
  src.job_grade_id,
  src.hire_date,
  src.confirmation_date,
  refs.payroll_group_id,
  src.bank_name,
  src.bank_branch,
  src.bank_account,
  src.salary,
  'Active',
  src.next_of_kin,
  src.emergency_contact
from refs,
(
  select
    'BLW-001' as employee_number,
    'Maya' as first_name,
    'Otieno' as last_name,
    'ID22000001' as national_id,
    'A220000001K' as kra_pin,
    'SHIF-220001' as shif_number,
    'NSSF-220001' as nssf_number,
    'Female' as gender,
    date '1988-02-14' as date_of_birth,
    '0711000001' as phone,
    'maya.otieno@bluewave.example' as email,
    'Permanent' as employment_type,
    refs.dept_fin as department_id,
    refs.branch_hq as branch_id,
    refs.des_payroll as designation_id,
    refs.grade_mgmt as job_grade_id,
    date '2022-01-10' as hire_date,
    date '2022-07-10' as confirmation_date,
    'KCB Bank' as bank_name,
    'Kenyatta Avenue' as bank_branch,
    '2200000001' as bank_account,
    142000.00::numeric as salary,
    jsonb_build_object('name','Alex Otieno','phone','0711222333') as next_of_kin,
    jsonb_build_object('name','Ruth Otieno','phone','0722333444') as emergency_contact
  from refs
  union all
  select
    'BLW-002',
    'Liam',
    'Mwangi',
    'ID22000002',
    'A220000002K',
    'SHIF-220002',
    'NSSF-220002',
    'Male',
    date '1991-04-02',
    '0711000002',
    'liam.mwangi@bluewave.example',
    'Permanent',
    refs.dept_ops,
    refs.branch_hq,
    refs.des_consultant,
    refs.grade_prof,
    date '2023-03-15',
    date '2023-09-15',
    'Equity Bank',
    'Moi Avenue',
    '2200000002',
    98000.00::numeric,
    jsonb_build_object('name','Martha Mwangi','phone','0711333444'),
    jsonb_build_object('name','Jane Mwangi','phone','0722444555')
  from refs
  union all
  select
    'BLW-003',
    'Asha',
    'Njeri',
    'ID22000003',
    'A220000003K',
    'SHIF-220003',
    'NSSF-220003',
    'Female',
    date '1994-08-21',
    '0711000003',
    'asha.njeri@bluewave.example',
    'Contract',
    refs.dept_people,
    refs.branch_coast,
    refs.des_hr,
    refs.grade_prof,
    date '2024-05-01',
    date '2024-11-01',
    'Co-operative Bank',
    'Kimathi Street',
    '2200000003',
    86000.00::numeric,
    jsonb_build_object('name','Ben Njeri','phone','0711444555'),
    jsonb_build_object('name','Rose Njeri','phone','0722555666')
  from refs
) as src
on conflict (employee_number) do update
set
  company_id = excluded.company_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  department_id = excluded.department_id,
  branch_id = excluded.branch_id,
  designation_id = excluded.designation_id,
  job_grade_id = excluded.job_grade_id,
  payroll_group_id = excluded.payroll_group_id,
  bank_name = excluded.bank_name,
  bank_branch = excluded.bank_branch,
  bank_account = excluded.bank_account,
  salary = excluded.salary,
  status = excluded.status;

update public.employees employee
set supervisor_employee_id = supervisor.id
from public.employees supervisor
where employee.company_id = '22222222-2222-2222-2222-222222222222'
  and supervisor.company_id = employee.company_id
  and employee.employee_number in ('BLW-002', 'BLW-003')
  and supervisor.employee_number = 'BLW-001';

insert into public.payroll_runs (
  id,
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
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Apr 2026',
  'Full Month',
  'Approved',
  timezone('utc', now()),
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
)
on conflict (id) do update
set
  company_id = excluded.company_id,
  period_label = excluded.period_label,
  payroll_type = excluded.payroll_type,
  status = excluded.status,
  processed_at = excluded.processed_at;

delete from public.payroll_employees
where payroll_run_id = '33333333-3333-3333-3333-333333333333';

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
  '33333333-3333-3333-3333-333333333333',
  employee.id,
  employee.salary,
  jsonb_build_object(
    'house_allowance', round(employee.salary * 0.12, 2),
    'commuter_allowance', 8500,
    'airtime_allowance', 3000
  ),
  jsonb_build_object(
    'paye', round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.18, 2),
    'shif', round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.0275, 2),
    'nssf', 1080,
    'housing_levy', round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.015, 2)
  ),
  round(employee.salary + round(employee.salary * 0.12, 2) + 11500, 2),
  round(
    employee.salary + round(employee.salary * 0.12, 2) + 11500
    - round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.18, 2)
    - round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.0275, 2)
    - 1080
    - round((employee.salary + round(employee.salary * 0.12, 2) + 11500) * 0.015, 2),
    2
  ),
  'processed'
from public.employees employee
where employee.company_id = '22222222-2222-2222-2222-222222222222'
  and employee.employee_number in ('BLW-001', 'BLW-002', 'BLW-003');

update public.payroll_runs run
set
  gross_pay = totals.gross_pay,
  net_pay = totals.net_pay,
  total_deductions = totals.total_deductions,
  employer_cost = totals.employer_cost,
  paye_total = totals.paye_total,
  shif_total = totals.shif_total,
  housing_levy_total = totals.housing_levy_total,
  nssf_total = totals.nssf_total,
  pension_total = 0,
  validation_errors = 0
from (
  select
    payroll_run_id,
    round(sum(gross_pay), 2) as gross_pay,
    round(sum(net_pay), 2) as net_pay,
    round(sum((deductions ->> 'paye')::numeric + (deductions ->> 'shif')::numeric + (deductions ->> 'nssf')::numeric + (deductions ->> 'housing_levy')::numeric), 2) as total_deductions,
    round(sum(gross_pay + 1080 + (deductions ->> 'housing_levy')::numeric), 2) as employer_cost,
    round(sum((deductions ->> 'paye')::numeric), 2) as paye_total,
    round(sum((deductions ->> 'shif')::numeric), 2) as shif_total,
    round(sum((deductions ->> 'housing_levy')::numeric), 2) as housing_levy_total,
    round(sum((deductions ->> 'nssf')::numeric), 2) as nssf_total
  from public.payroll_employees
  where payroll_run_id = '33333333-3333-3333-3333-333333333333'
  group by payroll_run_id
) as totals
where run.id = totals.payroll_run_id;
