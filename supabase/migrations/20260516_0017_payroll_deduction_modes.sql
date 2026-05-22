alter table public.attendance_adjustments
  add column if not exists deduction_mode text not null default 'day_count',
  add column if not exists fixed_amount numeric(12,2) not null default 0;

update public.attendance_adjustments
set deduction_mode = 'day_count'
where adjustment_type = 'payroll_deduction'
  and (deduction_mode is null or deduction_mode = '');

create index if not exists idx_attendance_adjustments_deduction_mode
  on public.attendance_adjustments (deduction_mode);
