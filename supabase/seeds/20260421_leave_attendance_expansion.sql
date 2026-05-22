do $$
declare
  company_id_var uuid;
  branch_id_var uuid;
  department_id_var uuid;
  device_id_var uuid;
  late_rule_id_var uuid;
  employee_row record;
  shift_day_id_var uuid;
  timesheet_id_var uuid;
  attendance_row record;
  employee_index integer := 0;
begin
  select id into company_id_var from public.companies order by created_at asc limit 1;
  if company_id_var is null then
    raise notice 'Skipping leave and attendance seed because no company exists.';
    return;
  end if;

  select id into branch_id_var from public.branches where company_id = company_id_var order by created_at asc limit 1;
  select id into department_id_var from public.departments where company_id = company_id_var order by created_at asc limit 1;

  insert into public.leave_types (company_id, code, name, color, is_paid, requires_attachment, gender_applicability, status)
  values
    (company_id_var, 'ANL', 'Annual Leave', '#2563eb', true, false, 'all', 'active'),
    (company_id_var, 'SCK', 'Sick Leave', '#ef4444', true, true, 'all', 'active'),
    (company_id_var, 'MAT', 'Maternity Leave', '#f97316', true, false, 'female', 'active'),
    (company_id_var, 'PAT', 'Paternity Leave', '#14b8a6', true, false, 'male', 'active'),
    (company_id_var, 'CMP', 'Compassionate Leave', '#8b5cf6', true, false, 'all', 'active'),
    (company_id_var, 'UPL', 'Unpaid Leave', '#475569', false, false, 'all', 'active'),
    (company_id_var, 'STU', 'Study Leave', '#0ea5e9', true, false, 'all', 'active'),
    (company_id_var, 'SPC', 'Special Leave', '#10b981', true, false, 'all', 'active')
  on conflict (company_id, code) do update
  set
    name = excluded.name,
    color = excluded.color,
    is_paid = excluded.is_paid,
    requires_attachment = excluded.requires_attachment,
    gender_applicability = excluded.gender_applicability,
    status = excluded.status;

  insert into public.holiday_calendars (company_id, branch_id, name, is_default, status)
  values (company_id_var, branch_id_var, 'Kenya Main Calendar', true, 'active')
  on conflict (company_id, name) do update
  set is_default = excluded.is_default, status = excluded.status;

  if not exists (
    select 1 from public.weekend_rules where company_id = company_id_var and name = 'Standard Monday-Friday'
  ) then
    insert into public.weekend_rules (company_id, branch_id, name, working_days, half_days, effective_from, status)
    values (
      company_id_var,
      branch_id_var,
      'Standard Monday-Friday',
      '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
      '["saturday"]'::jsonb,
      current_date,
      'active'
    );
  end if;

  if not exists (
    select 1 from public.leave_blackout_dates where company_id = company_id_var and title = 'Year-end stock take blackout'
  ) then
    insert into public.leave_blackout_dates (company_id, branch_id, department_id, title, start_date, end_date, notes, status)
    values (
      company_id_var,
      branch_id_var,
      department_id_var,
      'Year-end stock take blackout',
      date_trunc('month', current_date)::date + 20,
      date_trunc('month', current_date)::date + 25,
      'High-volume operations window.',
      'active'
    );
  end if;

  insert into public.attendance_devices (company_id, branch_id, device_name, device_code, device_type, status, last_sync_at, api_endpoint)
  values (
    company_id_var,
    branch_id_var,
    'Nairobi Biometric A',
    'NBIO-A',
    'biometric',
    'active',
    timezone('utc', now()) - interval '2 hours',
    'https://api.solvahr.local/device/nbio-a'
  )
  on conflict (company_id, device_code) do update
  set last_sync_at = excluded.last_sync_at, status = excluded.status
  returning id into device_id_var;

  if device_id_var is null then
    select id into device_id_var from public.attendance_devices where company_id = company_id_var and device_code = 'NBIO-A' limit 1;
  end if;

  insert into public.shifts (company_id, code, name, start_time, end_time, break_minutes, overtime_eligible, status)
  values
    (company_id_var, 'DAY', 'Day Shift', '08:00'::time, '17:00'::time, 60, true, 'active'),
    (company_id_var, 'NIGHT', 'Night Shift', '20:00'::time, '05:00'::time, 45, true, 'active')
  on conflict (company_id, code) do update
  set
    name = excluded.name,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    break_minutes = excluded.break_minutes,
    overtime_eligible = excluded.overtime_eligible,
    status = excluded.status;

  select id into shift_day_id_var from public.shifts where company_id = company_id_var and code = 'DAY' limit 1;

  if not exists (
    select 1 from public.lateness_rules where company_id = company_id_var and name = 'Default lateness control'
  ) then
    insert into public.lateness_rules (company_id, name, grace_minutes, warning_threshold, payroll_action, status)
    values (company_id_var, 'Default lateness control', 10, 3, 'summary_only', 'active');
  end if;

  select id into late_rule_id_var from public.lateness_rules where company_id = company_id_var and name = 'Default lateness control' limit 1;

  for employee_row in
    select id, company_id, branch_id, department_id, employee_number
    from public.employees
    where company_id = company_id_var
    order by employee_number asc
    limit 6
  loop
    employee_index := employee_index + 1;

    if not exists (
      select 1 from public.shift_assignments
      where employee_id = employee_row.id
        and shift_id = shift_day_id_var
        and effective_from = current_date - 30
    ) then
      insert into public.shift_assignments (
        company_id, shift_id, employee_id, department_id, branch_id, effective_from, pattern, status
      ) values (
        employee_row.company_id,
        shift_day_id_var,
        employee_row.id,
        employee_row.department_id,
        employee_row.branch_id,
        current_date - 30,
        'weekly',
        'active'
      );
    end if;

    if employee_index <= 3 then
      insert into public.timesheets (
        company_id,
        employee_id,
        week_start,
        week_end,
        total_hours,
        status,
        notes,
        submitted_by
      )
      values (
        employee_row.company_id,
        employee_row.id,
        date_trunc('week', current_date)::date,
        date_trunc('week', current_date)::date + 6,
        42,
        case when employee_index = 1 then 'pending' else 'approved' end,
        'Imported demo timesheet',
        (select id from public.users where employee_id = employee_row.id limit 1)
      )
      on conflict (employee_id, week_start) do nothing;

      select id into timesheet_id_var
      from public.timesheets
      where employee_id = employee_row.id
        and week_start = date_trunc('week', current_date)::date
      limit 1;

      if timesheet_id_var is not null then
        insert into public.timesheet_entries (timesheet_id, work_date, hours, project_name, task_name, notes)
        select
          timesheet_id_var,
          date_trunc('week', current_date)::date + day_index,
          case when day_index < 5 then 8.4 else 0 end,
          'Operations',
          'Daily support',
          'Demo timesheet entry'
        from generate_series(0, 6) as day_index
        where not exists (
          select 1
          from public.timesheet_entries entry
          where entry.timesheet_id = timesheet_id_var
            and entry.work_date = date_trunc('week', current_date)::date + day_index
        );
      end if;
    end if;
  end loop;

  for attendance_row in
    select id, company_id, employee_id, work_date, minutes_late, overtime_hours, status, clock_in_at, clock_out_at
    from public.attendance_records
    where company_id = company_id_var
      and (minutes_late > 0 or status = 'absent' or overtime_hours > 0)
    order by work_date desc
    limit 20
  loop
    if attendance_row.minutes_late > 0 and not exists (
      select 1 from public.lateness_records where attendance_record_id = attendance_row.id
    ) then
      insert into public.lateness_records (
        company_id, employee_id, attendance_record_id, rule_id, work_date, minutes_late, status, notes
      ) values (
        attendance_row.company_id,
        attendance_row.employee_id,
        attendance_row.id,
        late_rule_id_var,
        attendance_row.work_date,
        attendance_row.minutes_late,
        'open',
        'Auto-detected from attendance'
      );
    end if;

    if attendance_row.status = 'absent' and not exists (
      select 1 from public.absenteeism_records where attendance_record_id = attendance_row.id
    ) then
      insert into public.absenteeism_records (
        company_id, employee_id, attendance_record_id, work_date, absence_type, status, notes
      ) values (
        attendance_row.company_id,
        attendance_row.employee_id,
        attendance_row.id,
        attendance_row.work_date,
        'unexcused',
        'open',
        'Generated from absent attendance record'
      );
    end if;

    if not exists (
      select 1 from public.attendance_exceptions where attendance_record_id = attendance_row.id
    ) then
      insert into public.attendance_exceptions (
        company_id, employee_id, attendance_record_id, work_date, exception_type, severity, status, notes, payroll_relevant
      ) values (
        attendance_row.company_id,
        attendance_row.employee_id,
        attendance_row.id,
        attendance_row.work_date,
        case
          when attendance_row.status = 'absent' then 'absence'
          when attendance_row.minutes_late > 0 then 'lateness'
          when attendance_row.overtime_hours > 0 then 'overtime'
          else 'manual_review'
        end,
        case
          when attendance_row.status = 'absent' then 'critical'
          when attendance_row.minutes_late > 30 then 'warning'
          else 'info'
        end,
        'open',
        'Demo attendance exception',
        attendance_row.status = 'absent' or attendance_row.overtime_hours > 0
      );
    end if;

    if attendance_row.minutes_late > 0 and not exists (
      select 1 from public.attendance_adjustments where attendance_record_id = attendance_row.id
    ) then
      insert into public.attendance_adjustments (
        company_id,
        employee_id,
        attendance_record_id,
        work_date,
        requested_clock_in,
        requested_clock_out,
        reason,
        status,
        requested_by
      ) values (
        attendance_row.company_id,
        attendance_row.employee_id,
        attendance_row.id,
        attendance_row.work_date,
        attendance_row.clock_in_at - interval '15 minutes',
        attendance_row.clock_out_at,
        'Missed biometric due to device restart',
        'pending',
        (select id from public.users where employee_id = attendance_row.employee_id limit 1)
      );
    end if;
  end loop;

  if device_id_var is not null and not exists (
    select 1 from public.biometric_sync_logs where device_id = device_id_var and status = 'success'
  ) then
    insert into public.biometric_sync_logs (
      company_id,
      device_id,
      started_at,
      ended_at,
      status,
      message,
      records_synced
    ) values (
      company_id_var,
      device_id_var,
      timezone('utc', now()) - interval '2 hours',
      timezone('utc', now()) - interval '1 hour 50 minutes',
      'success',
      'Daily sync completed.',
      84
    );
  end if;
end
$$;
