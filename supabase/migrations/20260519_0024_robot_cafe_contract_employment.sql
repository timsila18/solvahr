update public.employees
set
  employment_type = 'Contract',
  updated_at = now()
where company_id in (
  select id
  from public.companies
  where lower(trim(name)) = 'robot cafe & bistro'
);
