create table if not exists public.employee_action_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  title text,
  author_user_id uuid references public.users(id) on delete set null,
  author_role text not null,
  author_name text not null,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_action_messages_employee_idx
  on public.employee_action_messages(employee_id, created_at desc);

create index if not exists employee_action_messages_entity_idx
  on public.employee_action_messages(company_id, employee_id, entity_type, entity_id, created_at desc);
