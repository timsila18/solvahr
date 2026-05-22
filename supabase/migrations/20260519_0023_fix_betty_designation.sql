update public.employees as e
set
  designation_id = d.id,
  updated_at = now()
from public.designations as d
where e.designation_id is distinct from d.id
  and d.company_id = e.company_id
  and lower(trim(d.title)) = 'hostess'
  and lower(trim(e.first_name || ' ' || e.last_name)) = 'betty alemayo';
