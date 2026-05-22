alter table public.attendance_adjustments
  add column if not exists target_payroll_run_id uuid,
  add column if not exists target_payroll_label text;

create index if not exists idx_attendance_adjustments_target_payroll_run
  on public.attendance_adjustments (target_payroll_run_id);
