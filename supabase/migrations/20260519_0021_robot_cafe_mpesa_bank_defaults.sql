update public.employees
set
  bank_name = 'Mobile Money - MPesa',
  bank_branch = 'MPesa Wallet',
  bank_account = regexp_replace(coalesce(phone, ''), '\s+', '', 'g')
where company_id in (
  select id
  from public.companies
  where name = 'Robot Cafe & Bistro'
)
and coalesce(phone, '') <> '';
