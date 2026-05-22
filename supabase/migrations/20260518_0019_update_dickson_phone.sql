update public.employees
set phone = '0115794738'
where employee_number = 'RC-048'
  and lower(trim(first_name || ' ' || last_name)) = 'dickson ndirangu';

update public.users
set phone = '0115794738'
where employee_id in (
  select id
  from public.employees
  where employee_number = 'RC-048'
    and lower(trim(first_name || ' ' || last_name)) = 'dickson ndirangu'
);
