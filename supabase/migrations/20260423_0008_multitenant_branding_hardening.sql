create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function public.same_company(target_company_id uuid)
returns boolean
language sql
stable
as $$
  select target_company_id is not null and target_company_id = public.current_company_id();
$$;

create or replace function public.storage_path_belongs_to_current_company(object_name text)
returns boolean
language sql
stable
as $$
  select object_name like ('companies/' || coalesce(public.current_company_id()::text, 'missing') || '/%');
$$;

drop policy if exists "branches_select_authenticated" on public.branches;
create policy "branches_select_scoped" on public.branches
for select using (public.same_company(company_id));

drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_scoped" on public.departments
for select using (public.same_company(company_id));

drop policy if exists "designations_select_authenticated" on public.designations;
create policy "designations_select_scoped" on public.designations
for select using (public.same_company(company_id));

drop policy if exists "job_grades_select_authenticated" on public.job_grades;
create policy "job_grades_select_scoped" on public.job_grades
for select using (public.same_company(company_id));

drop policy if exists "payroll_groups_select_authenticated" on public.payroll_groups;
create policy "payroll_groups_select_scoped" on public.payroll_groups
for select using (public.same_company(company_id));

drop policy if exists "approval_workflows_select_authenticated" on public.approval_workflows;
create policy "approval_workflows_select_scoped" on public.approval_workflows
for select using (public.same_company(company_id));

drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin" on public.users
for select using (
  id = auth.uid()
  or (
    public.same_company(company_id)
    and public.has_role(array['Super Admin','HR Admin','Auditor']::public.app_role[])
  )
);

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin" on public.users
for update using (
  id = auth.uid()
  or (
    public.same_company(company_id)
    and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
  )
)
with check (
  id = auth.uid()
  or (
    public.same_company(company_id)
    and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
  )
);

drop policy if exists "company_settings_select_admin" on public.company_settings;
create policy "company_settings_select_admin" on public.company_settings
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "company_settings_manage_admin" on public.company_settings;
create policy "company_settings_manage_admin" on public.company_settings
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);

drop policy if exists "role_definitions_select_admin" on public.role_definitions;
create policy "role_definitions_select_admin" on public.role_definitions
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "role_definitions_manage_admin" on public.role_definitions;
create policy "role_definitions_manage_admin" on public.role_definitions
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

drop policy if exists "role_permissions_select_admin" on public.role_permissions;
create policy "role_permissions_select_admin" on public.role_permissions
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "role_permissions_manage_admin" on public.role_permissions;
create policy "role_permissions_manage_admin" on public.role_permissions
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

drop policy if exists "notification_settings_select_admin" on public.notification_settings;
create policy "notification_settings_select_admin" on public.notification_settings
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "notification_settings_manage_admin" on public.notification_settings;
create policy "notification_settings_manage_admin" on public.notification_settings
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);

drop policy if exists "security_settings_select_admin" on public.security_settings;
create policy "security_settings_select_admin" on public.security_settings
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "security_settings_manage_admin" on public.security_settings;
create policy "security_settings_manage_admin" on public.security_settings
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin']::public.app_role[])
);

drop policy if exists "login_sessions_select_admin" on public.login_sessions;
create policy "login_sessions_select_admin" on public.login_sessions
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "access_logs_select_admin" on public.access_logs;
create policy "access_logs_select_admin" on public.access_logs
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor']::public.app_role[])
);

drop policy if exists "data_import_jobs_select_admin" on public.data_import_jobs;
create policy "data_import_jobs_select_admin" on public.data_import_jobs
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Auditor']::public.app_role[])
);

drop policy if exists "data_import_jobs_manage_admin" on public.data_import_jobs;
create policy "data_import_jobs_manage_admin" on public.data_import_jobs
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);

drop policy if exists "storage_select_hr_payroll" on storage.objects;
create policy "storage_select_hr_payroll" on storage.objects
for select using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.storage_path_belongs_to_current_company(name)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Finance Officer','Auditor','Operator']::public.app_role[])
);

drop policy if exists "storage_update_hr_payroll" on storage.objects;
create policy "storage_update_hr_payroll" on storage.objects
for all using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.storage_path_belongs_to_current_company(name)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
)
with check (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.storage_path_belongs_to_current_company(name)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

drop policy if exists "storage_delete_hr_payroll" on storage.objects;
create policy "storage_delete_hr_payroll" on storage.objects
for delete using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.storage_path_belongs_to_current_company(name)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);
