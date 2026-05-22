create table if not exists public.performance_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  payroll_admin_visibility_enabled boolean not null default true,
  payroll_admin_action_enabled boolean not null default false,
  kpi_categories jsonb not null default '[]'::jsonb,
  rating_scale jsonb not null default '[]'::jsonb,
  help_content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_kpis (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  designation_id uuid references public.designations(id) on delete set null,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  category text not null,
  assignment_scope text not null default 'individual',
  role_title text,
  measurement_unit text not null default 'percentage',
  target_value numeric(14,2),
  weight_percent numeric(6,2) not null default 0,
  period_label text not null,
  start_date date not null,
  end_date date not null,
  evidence_required boolean not null default false,
  status text not null default 'draft',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kpi_id uuid references public.performance_kpis(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  target text not null,
  activities jsonb not null default '[]'::jsonb,
  due_date date,
  progress_percent numeric(6,2) not null default 0,
  evidence_comments text,
  status text not null default 'active',
  department_objective text,
  expected_output text,
  performance_indicator text,
  timeline text,
  weighting numeric(6,2) not null default 0,
  responsible_person text,
  review_status text not null default 'not_started',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_work_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  goal_id uuid references public.performance_goals(id) on delete set null,
  quarter_label text not null,
  department_objective text not null,
  individual_target text not null,
  quarterly_activities jsonb not null default '[]'::jsonb,
  expected_output text,
  performance_indicator text,
  timeline text,
  weighting numeric(6,2) not null default 0,
  responsible_person text,
  review_status text not null default 'not_started',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appraisal_cycles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  cycle_type text not null,
  period_start date not null,
  period_end date not null,
  scoped_department_ids jsonb not null default '[]'::jsonb,
  scoped_role_titles jsonb not null default '[]'::jsonb,
  scoring_model text not null default 'weighted_kpi',
  self_evaluation_enabled boolean not null default true,
  supervisor_evaluation_enabled boolean not null default true,
  gm_evaluation_enabled boolean not null default true,
  payroll_admin_visibility_enabled boolean not null default true,
  payroll_admin_action_enabled boolean not null default false,
  status text not null default 'draft',
  launched_by uuid references public.users(id) on delete set null,
  finalized_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appraisal_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cycle_id uuid not null references public.appraisal_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  terms_of_service text,
  status text not null default 'self_review_pending',
  self_score numeric(7,2) not null default 0,
  supervisor_score numeric(7,2) not null default 0,
  gm_score numeric(7,2) not null default 0,
  final_score numeric(7,2) not null default 0,
  rating_band text,
  potential_rating text,
  final_decision text,
  self_comments text,
  supervisor_comments text,
  gm_comments text,
  hr_comments text,
  performance_discussion_held boolean,
  discussion_helped boolean,
  supervisor_contribution_comments text,
  challenges_summary text,
  issues_affecting_performance text,
  corrective_action text,
  next_quarter_actions text,
  development_needs text,
  support_required text,
  reward_recommendation text,
  sanction_recommendation text,
  training_recommendation text,
  pip_recommendation boolean not null default false,
  promotion_recommendation boolean not null default false,
  gm_endorsement text,
  probation_outcome text,
  self_submitted_at timestamptz,
  supervisor_submitted_at timestamptz,
  gm_finalized_at timestamptz,
  finalized_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, employee_id)
);

create table if not exists public.appraisal_review_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  review_id uuid not null references public.appraisal_reviews(id) on delete cascade,
  kpi_id uuid references public.performance_kpis(id) on delete set null,
  goal_id uuid references public.performance_goals(id) on delete set null,
  work_plan_id uuid references public.performance_work_plans(id) on delete set null,
  item_order integer not null default 0,
  section_name text not null,
  item_type text not null,
  title text not null,
  performance_indicator text,
  target_text text,
  target_value numeric(14,2),
  actual_text text,
  actual_value numeric(14,2),
  measurement_unit text,
  weight_percent numeric(6,2) not null default 0,
  qualitative_allowed boolean not null default false,
  self_score numeric(7,2) not null default 0,
  supervisor_score numeric(7,2) not null default 0,
  gm_score numeric(7,2) not null default 0,
  final_score numeric(7,2) not null default 0,
  achievement_percent numeric(7,2) not null default 0,
  rating_band text,
  expected_output text,
  timeline text,
  evidence_notes text,
  evaluator_comments text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appraisal_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  review_id uuid not null references public.appraisal_reviews(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  author_role text not null,
  stage text not null,
  visibility text not null default 'internal',
  comment_body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_additional_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  review_id uuid references public.appraisal_reviews(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assignment_title text not null,
  date_assigned date,
  assigned_by text,
  end_date date,
  progress_status text not null default 'planned',
  comments text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_pips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  review_id uuid references public.appraisal_reviews(id) on delete set null,
  issue text not null,
  improvement_target text not null,
  support_required text,
  review_date date,
  supervisor_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'active',
  outcome text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.promotion_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  review_id uuid references public.appraisal_reviews(id) on delete set null,
  current_role_title text not null,
  proposed_role_title text not null,
  current_salary numeric(14,2) not null default 0,
  proposed_salary numeric(14,2),
  performance_justification text not null,
  supervisor_recommendation text,
  gm_endorsement text,
  hr_review text,
  payroll_impact_flag boolean not null default false,
  linked_salary_request_task_id uuid references public.approval_tasks(id) on delete set null,
  status text not null default 'pending_calibration',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.succession_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  incumbent_employee_id uuid references public.employees(id) on delete set null,
  role_title text not null,
  criticality text not null default 'medium',
  risk_level text not null default 'medium',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.succession_candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  succession_role_id uuid not null references public.succession_roles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  readiness_level text not null default 'Ready Later',
  development_actions text,
  gm_comments text,
  risk_level text not null default 'medium',
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (succession_role_id, employee_id)
);

create table if not exists public.talent_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  review_id uuid references public.appraisal_reviews(id) on delete set null,
  performance_band text not null,
  potential_rating text not null,
  matrix_box text not null,
  notes text,
  assessed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.performance_report_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  review_id uuid not null references public.appraisal_reviews(id) on delete cascade,
  status_label text not null default 'PROVISIONAL',
  file_name text not null,
  content_type text not null default 'application/pdf',
  storage_bucket text,
  storage_path text,
  generated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_performance_kpis_employee on public.performance_kpis(company_id, employee_id, status);
create index if not exists idx_performance_goals_employee on public.performance_goals(company_id, employee_id, status);
create index if not exists idx_performance_work_plans_employee on public.performance_work_plans(company_id, employee_id, quarter_label);
create index if not exists idx_appraisal_cycles_company on public.appraisal_cycles(company_id, status, period_start desc);
create index if not exists idx_appraisal_reviews_employee on public.appraisal_reviews(company_id, employee_id, status);
create index if not exists idx_appraisal_review_items_review on public.appraisal_review_items(review_id, item_order);
create index if not exists idx_performance_pips_employee on public.performance_pips(company_id, employee_id, status);
create index if not exists idx_promotion_cases_employee on public.promotion_cases(company_id, employee_id, status);
create index if not exists idx_succession_roles_company on public.succession_roles(company_id, role_title);
create index if not exists idx_succession_candidates_role on public.succession_candidates(succession_role_id, readiness_level);
create index if not exists idx_talent_assessments_employee on public.talent_assessments(company_id, employee_id, created_at desc);
create index if not exists idx_performance_report_exports_review on public.performance_report_exports(review_id, created_at desc);

alter table public.performance_settings enable row level security;
alter table public.performance_kpis enable row level security;
alter table public.performance_goals enable row level security;
alter table public.performance_work_plans enable row level security;
alter table public.appraisal_cycles enable row level security;
alter table public.appraisal_reviews enable row level security;
alter table public.appraisal_review_items enable row level security;
alter table public.appraisal_comments enable row level security;
alter table public.performance_additional_assignments enable row level security;
alter table public.performance_pips enable row level security;
alter table public.promotion_cases enable row level security;
alter table public.succession_roles enable row level security;
alter table public.succession_candidates enable row level security;
alter table public.talent_assessments enable row level security;
alter table public.performance_report_exports enable row level security;

drop policy if exists "performance_settings_select_scoped" on public.performance_settings;
create policy "performance_settings_select_scoped" on public.performance_settings
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
);

drop policy if exists "performance_settings_manage_admin" on public.performance_settings;
create policy "performance_settings_manage_admin" on public.performance_settings
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

drop policy if exists "performance_kpis_select_scoped" on public.performance_kpis;
create policy "performance_kpis_select_scoped" on public.performance_kpis
for select using (
  public.same_company(company_id)
  and (
    employee_id is null
    or public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "performance_kpis_manage_scoped" on public.performance_kpis;
create policy "performance_kpis_manage_scoped" on public.performance_kpis
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(coalesce(employee_id, public.current_employee_id()))
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(coalesce(employee_id, public.current_employee_id()))
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "performance_goals_select_scoped" on public.performance_goals;
create policy "performance_goals_select_scoped" on public.performance_goals
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "performance_goals_manage_scoped" on public.performance_goals;
create policy "performance_goals_manage_scoped" on public.performance_goals
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "performance_work_plans_select_scoped" on public.performance_work_plans;
create policy "performance_work_plans_select_scoped" on public.performance_work_plans
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "performance_work_plans_manage_scoped" on public.performance_work_plans;
create policy "performance_work_plans_manage_scoped" on public.performance_work_plans
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "appraisal_cycles_select_scoped" on public.appraisal_cycles;
create policy "appraisal_cycles_select_scoped" on public.appraisal_cycles
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
);

drop policy if exists "appraisal_cycles_manage_scoped" on public.appraisal_cycles;
create policy "appraisal_cycles_manage_scoped" on public.appraisal_cycles
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

drop policy if exists "appraisal_reviews_select_scoped" on public.appraisal_reviews;
create policy "appraisal_reviews_select_scoped" on public.appraisal_reviews
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "appraisal_reviews_manage_scoped" on public.appraisal_reviews;
create policy "appraisal_reviews_manage_scoped" on public.appraisal_reviews
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "appraisal_review_items_select_scoped" on public.appraisal_review_items;
create policy "appraisal_review_items_select_scoped" on public.appraisal_review_items
for select using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
      )
  )
);

drop policy if exists "appraisal_review_items_manage_scoped" on public.appraisal_review_items;
create policy "appraisal_review_items_manage_scoped" on public.appraisal_review_items
for all using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
);

drop policy if exists "appraisal_comments_select_scoped" on public.appraisal_comments;
create policy "appraisal_comments_select_scoped" on public.appraisal_comments
for select using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
      )
  )
);

drop policy if exists "appraisal_comments_manage_scoped" on public.appraisal_comments;
create policy "appraisal_comments_manage_scoped" on public.appraisal_comments
for all using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
);

drop policy if exists "performance_additional_assignments_select_scoped" on public.performance_additional_assignments;
create policy "performance_additional_assignments_select_scoped" on public.performance_additional_assignments
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "performance_additional_assignments_manage_scoped" on public.performance_additional_assignments;
create policy "performance_additional_assignments_manage_scoped" on public.performance_additional_assignments
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "performance_pips_select_scoped" on public.performance_pips;
create policy "performance_pips_select_scoped" on public.performance_pips
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "performance_pips_manage_scoped" on public.performance_pips;
create policy "performance_pips_manage_scoped" on public.performance_pips
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "promotion_cases_select_scoped" on public.promotion_cases;
create policy "promotion_cases_select_scoped" on public.promotion_cases
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "promotion_cases_manage_scoped" on public.promotion_cases;
create policy "promotion_cases_manage_scoped" on public.promotion_cases
for all using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
)
with check (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
  )
);

drop policy if exists "succession_roles_select_scoped" on public.succession_roles;
create policy "succession_roles_select_scoped" on public.succession_roles
for select using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
);

drop policy if exists "succession_roles_manage_scoped" on public.succession_roles;
create policy "succession_roles_manage_scoped" on public.succession_roles
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

drop policy if exists "succession_candidates_select_scoped" on public.succession_candidates;
create policy "succession_candidates_select_scoped" on public.succession_candidates
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "succession_candidates_manage_scoped" on public.succession_candidates;
create policy "succession_candidates_manage_scoped" on public.succession_candidates
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

drop policy if exists "talent_assessments_select_scoped" on public.talent_assessments;
create policy "talent_assessments_select_scoped" on public.talent_assessments
for select using (
  public.same_company(company_id)
  and (
    public.can_access_employee(employee_id)
    or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
  )
);

drop policy if exists "talent_assessments_manage_scoped" on public.talent_assessments;
create policy "talent_assessments_manage_scoped" on public.talent_assessments
for all using (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
)
with check (
  public.same_company(company_id)
  and public.has_role(array['Super Admin','HR Admin','Manager']::public.app_role[])
);

drop policy if exists "performance_report_exports_select_scoped" on public.performance_report_exports;
create policy "performance_report_exports_select_scoped" on public.performance_report_exports
for select using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor','Auditor']::public.app_role[])
      )
  )
);

drop policy if exists "performance_report_exports_manage_scoped" on public.performance_report_exports;
create policy "performance_report_exports_manage_scoped" on public.performance_report_exports
for all using (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1
    from public.appraisal_reviews review
    where review.id = review_id
      and public.same_company(review.company_id)
      and (
        public.can_access_employee(review.employee_id)
        or public.has_role(array['Super Admin','HR Admin','Payroll Admin','Manager','Supervisor']::public.app_role[])
      )
  )
);

drop trigger if exists set_performance_settings_updated_at on public.performance_settings;
create trigger set_performance_settings_updated_at
before update on public.performance_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_kpis_updated_at on public.performance_kpis;
create trigger set_performance_kpis_updated_at
before update on public.performance_kpis
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_goals_updated_at on public.performance_goals;
create trigger set_performance_goals_updated_at
before update on public.performance_goals
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_work_plans_updated_at on public.performance_work_plans;
create trigger set_performance_work_plans_updated_at
before update on public.performance_work_plans
for each row execute procedure public.set_updated_at();

drop trigger if exists set_appraisal_cycles_updated_at on public.appraisal_cycles;
create trigger set_appraisal_cycles_updated_at
before update on public.appraisal_cycles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_appraisal_reviews_updated_at on public.appraisal_reviews;
create trigger set_appraisal_reviews_updated_at
before update on public.appraisal_reviews
for each row execute procedure public.set_updated_at();

drop trigger if exists set_appraisal_review_items_updated_at on public.appraisal_review_items;
create trigger set_appraisal_review_items_updated_at
before update on public.appraisal_review_items
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_additional_assignments_updated_at on public.performance_additional_assignments;
create trigger set_performance_additional_assignments_updated_at
before update on public.performance_additional_assignments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_performance_pips_updated_at on public.performance_pips;
create trigger set_performance_pips_updated_at
before update on public.performance_pips
for each row execute procedure public.set_updated_at();

drop trigger if exists set_promotion_cases_updated_at on public.promotion_cases;
create trigger set_promotion_cases_updated_at
before update on public.promotion_cases
for each row execute procedure public.set_updated_at();

drop trigger if exists set_succession_roles_updated_at on public.succession_roles;
create trigger set_succession_roles_updated_at
before update on public.succession_roles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_succession_candidates_updated_at on public.succession_candidates;
create trigger set_succession_candidates_updated_at
before update on public.succession_candidates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_talent_assessments_updated_at on public.talent_assessments;
create trigger set_talent_assessments_updated_at
before update on public.talent_assessments
for each row execute procedure public.set_updated_at();

insert into public.performance_settings (
  company_id,
  payroll_admin_visibility_enabled,
  payroll_admin_action_enabled,
  kpi_categories,
  rating_scale,
  help_content
)
select
  id,
  true,
  false,
  '["Sales Performance","Customer Service","Attendance & Reliability","Food Quality / Service Quality","Hygiene & Compliance","Teamwork","Speed of Service","Stock / Waste Control","Leadership","Training Completion"]'::jsonb,
  '[{"label":"Excellent","minimum":101,"maximum":999},{"label":"Good","minimum":100,"maximum":100},{"label":"Fair","minimum":80,"maximum":99.99},{"label":"Poor","minimum":70,"maximum":79.99},{"label":"Very Poor","minimum":0,"maximum":69.99}]'::jsonb,
  '{
    "howToSetKpi":"Set one measurable outcome, define a clear unit, assign a weight, and make the target realistic for the review period.",
    "howScoringWorks":"Achievement percentage is actual divided by target. The weighted contribution uses the KPI weight.",
    "workflow":"Employee self-review flows to supervisor review, then GM calibration and finalization."
  }'::jsonb
from public.companies
where id = '33333333-3333-3333-3333-333333333333'
on conflict (company_id) do nothing;
