alter table public.employee_documents
  add column if not exists document_type text,
  add column if not exists version_number integer not null default 1,
  add column if not exists issue_date date,
  add column if not exists generated_by uuid references public.users(id) on delete set null,
  add column if not exists approved_by uuid references public.users(id) on delete set null,
  add column if not exists approval_task_id uuid references public.approval_tasks(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists employee_documents_employee_type_idx
  on public.employee_documents (employee_id, document_type, uploaded_at desc);
