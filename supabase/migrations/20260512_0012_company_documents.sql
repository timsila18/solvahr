create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  title text not null,
  description text,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  issue_date date,
  uploaded_by uuid references public.users(id) on delete set null,
  is_published boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists company_documents_company_file_name_idx
  on public.company_documents (company_id, file_name);

create index if not exists company_documents_company_issue_idx
  on public.company_documents (company_id, issue_date desc, created_at desc);

alter table public.company_documents enable row level security;

drop policy if exists "company_documents_select_scoped" on public.company_documents;
create policy "company_documents_select_scoped" on public.company_documents
for select
using (
  public.same_company(company_id)
  and is_published = true
);

drop policy if exists "company_documents_manage_scoped" on public.company_documents;
create policy "company_documents_manage_scoped" on public.company_documents
for all
using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager','Operator']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager','Operator']::public.app_role[])
);
