create table if not exists public.cv_service_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_channel text not null default 'public',
  public_token text not null unique,
  package_key text not null,
  package_name text not null,
  package_price numeric(12,2) not null default 0,
  package_best_for text,
  customer_name text,
  phone text,
  email text,
  location text,
  linkedin_url text,
  portfolio_url text,
  target_role text,
  industry text,
  country_region text,
  preferred_cv_style text,
  job_description text,
  current_profession text,
  years_of_experience numeric(7,2),
  career_objective text,
  major_achievements text,
  preferred_tone text,
  special_instructions text,
  education_entries jsonb not null default '[]'::jsonb,
  qualification_entries jsonb not null default '[]'::jsonb,
  experience_entries jsonb not null default '[]'::jsonb,
  skill_entries jsonb not null default '[]'::jsonb,
  referee_entries jsonb not null default '[]'::jsonb,
  existing_cv_text text,
  existing_cv_paste text,
  uploaded_cv_path text,
  uploaded_cv_name text,
  uploaded_cv_mime text,
  uploaded_cv_size bigint,
  payment_status text not null default 'pending',
  payment_method text not null default 'test_mode',
  payment_reference text,
  checkout_request_id text,
  receipt_number text,
  amount_paid numeric(12,2),
  paid_at timestamptz,
  generation_status text not null default 'pending',
  generated_at timestamptz,
  generated_cv_json jsonb not null default '{}'::jsonb,
  generated_docx_path text,
  generated_pdf_path text,
  order_status text not null default 'draft',
  download_count integer not null default 0,
  last_downloaded_at timestamptz,
  download_log jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  expired_at timestamptz,
  deleted_large_files_at timestamptz,
  admin_notes text
);

create index if not exists cv_service_orders_created_at_idx
  on public.cv_service_orders (created_at desc);

create index if not exists cv_service_orders_payment_status_idx
  on public.cv_service_orders (payment_status);

create index if not exists cv_service_orders_generation_status_idx
  on public.cv_service_orders (generation_status);

create index if not exists cv_service_orders_order_status_idx
  on public.cv_service_orders (order_status);

create or replace function public.set_cv_service_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cv_service_orders_updated_at on public.cv_service_orders;

create trigger trg_cv_service_orders_updated_at
before update on public.cv_service_orders
for each row
execute function public.set_cv_service_orders_updated_at();
