alter table public.cv_service_orders
  add column if not exists profile_photo_path text,
  add column if not exists profile_photo_name text,
  add column if not exists profile_photo_mime text,
  add column if not exists profile_photo_size bigint;
