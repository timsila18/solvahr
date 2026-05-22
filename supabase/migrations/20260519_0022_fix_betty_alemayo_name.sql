update public.employees
set
  first_name = 'Betty',
  last_name = 'Alemayo',
  updated_at = now()
where lower(trim(first_name || ' ' || last_name)) = 'betty alemaiyo';

update public.users
set
  full_name = 'Betty Alemayo',
  updated_at = now()
where employee_id in (
  select id
  from public.employees
  where lower(trim(first_name || ' ' || last_name)) = 'betty alemayo'
);
