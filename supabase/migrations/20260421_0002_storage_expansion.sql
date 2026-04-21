insert into storage.buckets (id, name, public)
values
  ('payslips', 'payslips', false),
  ('company-assets', 'company-assets', false)
on conflict (id) do nothing;

drop policy if exists "storage_read_authenticated" on storage.objects;
drop policy if exists "storage_write_hr_payroll" on storage.objects;
drop policy if exists "storage_update_hr_payroll" on storage.objects;
drop policy if exists "storage_delete_hr_payroll" on storage.objects;

create policy "storage_read_authenticated" on storage.objects
for select
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and auth.role() = 'authenticated'
);

create policy "storage_write_hr_payroll" on storage.objects
for insert
with check (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

create policy "storage_update_hr_payroll" on storage.objects
for update
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
)
with check (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Operator']::public.app_role[])
);

create policy "storage_delete_hr_payroll" on storage.objects
for delete
using (
  bucket_id in ('employee-documents', 'payroll-documents', 'payslips', 'company-assets', 'attachments')
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin']::public.app_role[])
);
