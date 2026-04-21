insert into public.leave_policies (
  company_id,
  leave_type,
  policy_name,
  annual_allowance,
  accrual_frequency,
  carry_forward_limit,
  requires_attachment,
  color,
  status
)
select
  c.id,
  x.leave_type,
  x.policy_name,
  x.annual_allowance,
  x.accrual_frequency,
  x.carry_forward_limit,
  x.requires_attachment,
  x.color,
  'active'
from public.companies c
cross join (
  values
    ('Annual Leave', 'Annual Leave Policy', 21.00, 'monthly', 5.00, false, '#2563eb'),
    ('Sick Leave', 'Sick Leave Policy', 14.00, 'annual', 0.00, true, '#0f766e'),
    ('Compassionate Leave', 'Compassionate Leave Policy', 5.00, 'annual', 0.00, false, '#7c3aed'),
    ('Maternity Leave', 'Maternity Leave Policy', 90.00, 'annual', 0.00, true, '#db2777'),
    ('Paternity Leave', 'Paternity Leave Policy', 14.00, 'annual', 0.00, false, '#ea580c')
) as x(leave_type, policy_name, annual_allowance, accrual_frequency, carry_forward_limit, requires_attachment, color)
on conflict (company_id, leave_type) do update
set
  policy_name = excluded.policy_name,
  annual_allowance = excluded.annual_allowance,
  accrual_frequency = excluded.accrual_frequency,
  carry_forward_limit = excluded.carry_forward_limit,
  requires_attachment = excluded.requires_attachment,
  color = excluded.color,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.leave_balances (
  company_id,
  employee_id,
  leave_type,
  opening_balance,
  accrued_days,
  taken_days,
  pending_days,
  balance_days,
  as_of_date
)
select
  e.company_id,
  e.id,
  'Annual Leave',
  3.00,
  7.00,
  (row_number() over (order by e.employee_number) % 4)::numeric,
  (row_number() over (order by e.employee_number) % 2)::numeric,
  greatest(0, 10 - (row_number() over (order by e.employee_number) % 4) - (row_number() over (order by e.employee_number) % 2)),
  date '2026-04-21'
from public.employees e
on conflict (employee_id, leave_type, as_of_date) do nothing;

insert into public.leave_balances (
  company_id,
  employee_id,
  leave_type,
  opening_balance,
  accrued_days,
  taken_days,
  pending_days,
  balance_days,
  as_of_date
)
select
  e.company_id,
  e.id,
  'Sick Leave',
  0.00,
  14.00,
  (row_number() over (order by e.employee_number) % 3)::numeric,
  0.00,
  greatest(0, 14 - (row_number() over (order by e.employee_number) % 3)),
  date '2026-04-21'
from public.employees e
on conflict (employee_id, leave_type, as_of_date) do nothing;

insert into public.holidays (company_id, branch_id, name, holiday_date, scope, is_paid)
select c.id, null, h.name, h.holiday_date, 'company', true
from public.companies c
cross join (
  values
    ('Labour Day', date '2026-05-01'),
    ('Madaraka Day', date '2026-06-01'),
    ('Huduma Day', date '2026-10-10'),
    ('Mashujaa Day', date '2026-10-20'),
    ('Jamhuri Day', date '2026-12-12')
) as h(name, holiday_date)
where not exists (
  select 1
  from public.holidays existing
  where existing.company_id = c.id
    and existing.name = h.name
    and existing.holiday_date = h.holiday_date
);

with sample_employees as (
  select
    e.id as employee_id,
    e.company_id,
    row_number() over (order by e.employee_number) as seq
  from public.employees e
  order by e.employee_number
  limit 40
),
workdays as (
  select date '2026-04-14' as work_date
  union all select date '2026-04-15'
  union all select date '2026-04-16'
  union all select date '2026-04-17'
  union all select date '2026-04-20'
),
attendance_source as (
  select
    se.company_id,
    se.employee_id,
    wd.work_date,
    case
      when se.seq % 11 = 0 then 'absent'
      when se.seq % 7 = 0 then 'late'
      else 'present'
    end as status,
    case when se.seq % 7 = 0 then 25 else 0 end as minutes_late,
    case when se.seq % 5 = 0 then 2.50 else 0.00 end as overtime_hours
  from sample_employees se
  cross join workdays wd
)
insert into public.attendance_records (
  company_id,
  employee_id,
  work_date,
  shift_name,
  scheduled_start_at,
  scheduled_end_at,
  clock_in_at,
  clock_out_at,
  status,
  minutes_late,
  minutes_early_leave,
  overtime_hours,
  source,
  notes
)
select
  s.company_id,
  s.employee_id,
  s.work_date,
  'Day Shift',
  (s.work_date::timestamp + time '08:00') at time zone 'Africa/Nairobi',
  (s.work_date::timestamp + time '17:00') at time zone 'Africa/Nairobi',
  case when s.status = 'absent' then null else ((s.work_date::timestamp + time '08:00') + make_interval(mins => s.minutes_late)) at time zone 'Africa/Nairobi' end,
  case when s.status = 'absent' then null else ((s.work_date::timestamp + time '17:00') + make_interval(hours => floor(s.overtime_hours)::int, mins => ((s.overtime_hours - floor(s.overtime_hours)) * 60)::int)) at time zone 'Africa/Nairobi' end,
  s.status,
  s.minutes_late,
  0,
  s.overtime_hours,
  'demo-seed',
  case when s.status = 'absent' then 'Auto-seeded absence for testing' else 'Auto-seeded attendance for testing' end
from attendance_source s
on conflict (employee_id, work_date) do nothing;

insert into public.overtime_requests (
  company_id,
  employee_id,
  attendance_record_id,
  work_date,
  hours,
  rate_type,
  reason,
  status,
  created_by
)
select
  a.company_id,
  a.employee_id,
  a.id,
  a.work_date,
  a.overtime_hours,
  'standard',
  'Operational overtime captured from attendance import',
  case when row_number() over (order by a.employee_id, a.work_date) % 3 = 0 then 'approved' else 'pending' end,
  u.id
from public.attendance_records a
left join public.users u on u.employee_id = a.employee_id
where a.overtime_hours > 0
  and not exists (
    select 1
    from public.overtime_requests existing
    where existing.attendance_record_id = a.id
  );

with target_employees as (
  select
    e.id,
    e.company_id,
    e.employee_number,
    row_number() over (order by e.employee_number) as seq
  from public.employees e
  order by e.employee_number
  limit 12
)
insert into public.leave_requests (
  company_id,
  employee_id,
  leave_type,
  start_date,
  end_date,
  days,
  reason,
  status,
  created_by
)
select
  t.company_id,
  t.id,
  case when t.seq % 4 = 0 then 'Sick Leave' else 'Annual Leave' end,
  date '2026-04-22' + ((t.seq % 5)::int),
  date '2026-04-22' + ((t.seq % 5)::int) + case when t.seq % 4 = 0 then 0 else 2 end,
  case when t.seq % 4 = 0 then 1 else 3 end,
  'Seeded leave request for live workflow testing',
  case when t.seq % 3 = 0 then 'approved' else 'pending' end,
  u.id
from target_employees t
left join public.users u on u.employee_id = t.id
where not exists (
  select 1
  from public.leave_requests existing
  where existing.employee_id = t.id
    and existing.start_date = date '2026-04-22' + ((t.seq % 5)::int)
);
