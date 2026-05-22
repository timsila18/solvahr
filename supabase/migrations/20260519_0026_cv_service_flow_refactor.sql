alter table public.cv_service_orders
  add column if not exists cv_source_mode text not null default 'manual',
  add column if not exists referees_on_request boolean not null default false,
  add column if not exists extraction_preview_json jsonb,
  add column if not exists generation_attempts integer not null default 0,
  add column if not exists last_generation_error text;
