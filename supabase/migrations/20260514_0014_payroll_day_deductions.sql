alter table public.attendance_adjustments
  add column if not exists adjustment_type text not null default 'clock_correction',
  add column if not exists end_date date,
  add column if not exists deduction_days numeric(8,2) not null default 0,
  add column if not exists deduction_category text,
  add column if not exists notes text,
  add column if not exists created_by_role text;

create index if not exists idx_attendance_adjustments_company_type_status
  on public.attendance_adjustments(company_id, adjustment_type, status, work_date desc);

create index if not exists idx_attendance_adjustments_employee_type
  on public.attendance_adjustments(employee_id, adjustment_type, work_date desc);
