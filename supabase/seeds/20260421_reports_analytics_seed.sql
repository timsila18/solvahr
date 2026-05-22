do $$
declare
  company_id_var uuid;
  creator_id_var uuid;
  hr_template_id uuid;
  payroll_template_id uuid;
begin
  select id into company_id_var from public.companies order by created_at asc limit 1;
  select id into creator_id_var
  from public.users
  where role in ('Super Admin', 'HR Admin', 'Payroll Admin', 'Finance Officer')
  order by created_at asc
  limit 1;

  if company_id_var is null or creator_id_var is null then
    raise notice 'Skipping reports analytics seed because company or creator user is missing.';
    return;
  end if;

  insert into public.report_templates (
    company_id, module_key, category, name, description, definition, visibility, is_favorite, status, created_by, updated_by, last_run_at
  )
  values
    (
      company_id_var,
      'reports',
      'HR Reports',
      'Employee Master List',
      'Core staff register by branch, department, and employment type.',
      '{"module":"employees","fields":["employee_number","full_name","department","branch","employment_type","status"],"filters":{"status":"active"}}'::jsonb,
      'shared',
      true,
      'active',
      creator_id_var,
      creator_id_var,
      timezone('utc', now()) - interval '1 day'
    ),
    (
      company_id_var,
      'reports',
      'Payroll Reports',
      'Payroll Register',
      'Latest payroll register with gross, deductions, and net.',
      '{"module":"payroll","fields":["employee_number","employee_name","gross_pay","net_pay"],"filters":{"period":"latest"}}'::jsonb,
      'shared',
      true,
      'active',
      creator_id_var,
      creator_id_var,
      timezone('utc', now()) - interval '3 hours'
    ),
    (
      company_id_var,
      'reports',
      'Executive Dashboard',
      'Board Summary Pack',
      'Executive summary of payroll, headcount, leave, attendance, and approvals.',
      '{"module":"executive","fields":["headcount","gross_pay","net_pay","turnover_rate","attendance_rate"],"filters":{"scope":"company"}}'::jsonb,
      'restricted',
      false,
      'active',
      creator_id_var,
      creator_id_var,
      timezone('utc', now()) - interval '2 hours'
    )
  on conflict do nothing;

  select id into hr_template_id
  from public.report_templates
  where company_id = company_id_var and name = 'Employee Master List'
  limit 1;

  select id into payroll_template_id
  from public.report_templates
  where company_id = company_id_var and name = 'Payroll Register'
  limit 1;

  if hr_template_id is not null and not exists (
    select 1 from public.scheduled_reports where template_id = hr_template_id and name = 'Weekly HR Snapshot'
  ) then
    insert into public.scheduled_reports (
      company_id, template_id, name, frequency, export_type, recipients, status, next_run_at, last_run_at, created_by
    ) values (
      company_id_var,
      hr_template_id,
      'Weekly HR Snapshot',
      'Weekly',
      'csv',
      '["hr@solvahr.app","director@solvahr.app"]'::jsonb,
      'active',
      timezone('utc', now()) + interval '5 days',
      timezone('utc', now()) - interval '2 days',
      creator_id_var
    );
  end if;

  if payroll_template_id is not null and not exists (
    select 1 from public.scheduled_reports where template_id = payroll_template_id and name = 'Month-End Payroll Pack'
  ) then
    insert into public.scheduled_reports (
      company_id, template_id, name, frequency, export_type, recipients, status, next_run_at, last_run_at, created_by
    ) values (
      company_id_var,
      payroll_template_id,
      'Month-End Payroll Pack',
      'Monthly',
      'excel',
      '["payroll@solvahr.app","finance@solvahr.app"]'::jsonb,
      'active',
      timezone('utc', now()) + interval '9 days',
      timezone('utc', now()) - interval '20 days',
      creator_id_var
    );
  end if;

  insert into public.report_exports (
    company_id, template_id, module_key, category, report_name, report_key, filters, export_type, status, file_name, created_by
  )
  values
    (
      company_id_var,
      hr_template_id,
      'reports',
      'HR Reports',
      'Employee Master List',
      'employee_master_list',
      '{"status":"active"}'::jsonb,
      'csv',
      'ready',
      'employee-master-list.csv',
      creator_id_var
    ),
    (
      company_id_var,
      payroll_template_id,
      'reports',
      'Payroll Reports',
      'Payroll Register',
      'payroll_register',
      '{"period":"latest"}'::jsonb,
      'excel',
      'ready',
      'payroll-register.csv',
      creator_id_var
    )
  on conflict do nothing;

  insert into public.report_access_logs (
    company_id, template_id, module_key, category, report_name, report_key, action, filters, export_type, actor_id, actor_email, actor_role, outcome
  )
  values
    (
      company_id_var,
      hr_template_id,
      'reports',
      'HR Reports',
      'Employee Master List',
      'employee_master_list',
      'run',
      '{"status":"active"}'::jsonb,
      null,
      creator_id_var,
      (select email from public.users where id = creator_id_var),
      (select role from public.users where id = creator_id_var),
      'success'
    ),
    (
      company_id_var,
      payroll_template_id,
      'reports',
      'Payroll Reports',
      'Payroll Register',
      'payroll_register',
      'export',
      '{"period":"latest"}'::jsonb,
      'excel',
      creator_id_var,
      (select email from public.users where id = creator_id_var),
      (select role from public.users where id = creator_id_var),
      'success'
    )
  on conflict do nothing;
end
$$;
