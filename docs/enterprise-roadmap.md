# Solva HR Enterprise Roadmap

This roadmap extends the current live Solva HR platform into a more operational, enterprise-ready workforce system, with special focus on Robot Cafe & Bistro shift scheduling and a more reliable statutory export architecture.

## Current Platform Baseline

Solva HR already supports the following live foundations:

- multi-tenant organization isolation
- payroll processing and approvals
- ESS
- role-based access
- reporting and exports
- statutory export flows
- AI Assist
- performance tracking
- onboarding and audit trails
- Robot Cafe & Bistro as an active tenant

This roadmap does not replace that foundation. It builds the next operational layer on top of it.

## Guiding Principles

- Preserve tenant isolation at every layer
- Preserve payroll accuracy and auditability
- Keep ESS simple for staff
- Prefer template-driven workflows over ad hoc uploads
- Generate exports with warnings instead of failing silently
- Keep UI polished, minimal, and non-overlapping
- Build reusable platform architecture, not one-off Robot Cafe hacks

## Workstream A: Robot Cafe Roster And Shift Operations

### Phase 1: Roster Module Foundation

Build a dedicated roster and shift management capability for Robot Cafe with:

- weekly rosters
- monthly rosters
- day-by-day shift assignment
- supervisor-managed schedule ownership
- employee ESS shift visibility
- Excel-driven roster upload workflow

Primary model additions:

- shift definitions
- roster periods
- roster assignments
- supervisor roster submissions
- roster validation results

### Phase 2: Shift Definitions

Seed standard Robot Cafe shifts:

- `AM`: `6:30 AM - 2:00 PM`
- `SWING`: `10:30 AM - 6:00 PM`
- `PM`: `2:30 PM - 11:00 PM`
- `OFF`
- `LEAVE`

Rules:

- one primary shift per employee per day
- one employee cannot have overlapping primary shifts on the same day
- OFF and LEAVE should be explicit schedule states
- overtime should be captured as a marker or linked attendance extension, not as a second primary shift
- future custom shifts should be tenant-configurable

### Phase 3: Excel Roster Template

Provide a downloadable Robot Cafe roster template for supervisors.

Template shape:

- Staff Number
- Employee Name
- Department
- Roster Period Type
- Roster Label
- one date column per day in the selected week or month

Accepted cell values:

- `AM`
- `SWING`
- `PM`
- `OFF`
- `LEAVE`

Quality rules:

- branded Robot Cafe template
- Solva HR footer
- protected header structure where useful
- explicit legend sheet or note row
- downloadable sample roster included

### Phase 4: Supervisor Upload Workflow

Supervisors should be able to:

- download template
- populate shifts offline
- upload completed Excel file
- run validation
- preview parsed results
- save draft roster
- submit final roster

Validation should detect:

- invalid employee references
- duplicate shift assignments
- unsupported shift codes
- missing required employees
- date-range mismatches
- assignments outside supervisor team scope

Error feedback should be cell-aware wherever possible, for example:

- row number
- column/date
- employee affected
- reason

### Phase 5: ESS Shift Visibility

Employees should see shifts inside ESS only.

Minimum ESS shift features:

- `My Shift Today`
- upcoming shifts
- weekly schedule
- monthly schedule
- OFF days
- leave days
- shift history

Recommended ESS surfaces:

- dashboard widget
- weekly calendar-style panel
- monthly roster view
- mobile-friendly compact cards

### Phase 6: Supervisor Shift Dashboard

Supervisors should see roster operations for their assigned team:

- today's scheduled team
- missing assignments
- leave overlaps
- attendance exceptions
- shift distribution counts

Summary metrics:

- AM count
- SWING count
- PM count
- OFF count
- leave count

### Phase 7: Attendance And Payroll Linkage

Roster data should become an operational input into attendance and, later, payroll controls.

Near-term linkage:

- compare scheduled shift against actual attendance
- track lateness against shift start time
- flag unexcused absence
- support overtime capture from shift extension

Future payroll linkage:

- unpaid absence deductions
- overtime calculation
- holiday shift logic
- roster-informed staffing cost analysis

## Workstream B: Statutory Export Architecture Redesign

### Problem Statement

The current statutory export flow is too rigid because uploaded templates behave like hard dependencies. Small structure changes create fragile export logic and harder support.

### Target Architecture

Solva HR should own internal master export structures for:

- PAYE
- SHIF
- NSSF
- HELB
- Net to Bank
- Housing Levy

Uploaded tenant templates should be treated as mapping references, not as the only valid structure.

### Phase 8: Master Template Layer

Create internal Solva HR master export definitions containing:

- canonical field names
- required fields
- optional fields
- default formatting
- file type
- totals behavior
- warning rules

Each export should have:

- a stable internal schema
- a renderer
- a mapping profile
- a validation profile

### Phase 9: Export Mapping Engine

Build a configurable mapping layer so the system can:

- reorder columns
- rename headers
- enable or disable optional fields
- fill fallback values
- leave blanks where allowed
- warn instead of fully blocking

Core mapping expectations:

#### PAYE

- employee name
- KRA PIN
- gross pay
- taxable pay
- PAYE
- SHIF
- NSSF
- Housing Levy
- reliefs
- benefits
- employer name

#### SHIF

- employee details
- SHIF number
- ID
- contribution amount

#### NSSF

- NSSF number
- ID
- gross pay
- contribution

#### HELB

- ID
- staff number
- names
- amount

#### Net to Bank

- bank
- branch
- account
- net pay
- staff number
- employee name

### Phase 10: Template Management UI

Add a `Statutory Template Management` page for:

- Super Admin
- Payroll Admin

Capabilities:

- preview export structure
- edit column mapping
- reorder columns
- enable or disable optional fields
- download sample export
- inspect warning rules

### Phase 11: Generate With Warnings

Exports should prefer completion with traceable warnings.

If data such as KRA PIN, SHIF number, NSSF number, or bank details is missing:

- generate export where structure allows
- mark affected rows
- provide warning summary
- record export history outcome
- block only when generation would become materially invalid

Warning outcomes should clearly state whether a row was:

- included with blank value
- included with fallback
- excluded
- blocked

## Workstream C: Delivery Order And Rollout

### Recommended Implementation Order

1. Data model and access model for shifts and rosters
2. Supervisor roster template download and upload validation
3. ESS shift visibility
4. Supervisor roster dashboard
5. Attendance linkage
6. Master statutory export schema layer
7. Mapping engine
8. Template management UI
9. export history and warning UX polish

### Rollout Gates

Before enabling broad tenant usage:

- supervisor upload flow validated end to end
- employee ESS shift visibility confirmed on desktop and mobile
- attendance linkage confirmed against at least one full week of real Robot Cafe data
- each statutory export generated from master template architecture
- warning summaries tested for incomplete employee records
- export totals reconciled to payroll

## QA Expectations

### Roster QA

- supervisor downloads roster template
- fills shifts correctly
- upload validation catches bad codes and bad names
- preview matches uploaded intent
- employees see correct shifts in ESS
- supervisors only manage their own teams

### Payroll And Attendance QA

- scheduled shift compares correctly to attendance
- late arrivals flagged correctly
- overtime markers do not distort base shift assignment
- absences can be surfaced for payroll follow-up

### Export QA

- PAYE generates
- SHIF generates
- NSSF generates
- HELB generates
- Net to Bank generates
- Housing Levy generates
- all required fields appear
- totals reconcile
- warnings display and export history logs outcome

## Dependencies And Risks

Key dependencies:

- clean employee identifiers
- stable supervisor-to-team relationships
- attendance timestamps reliable enough for shift comparison
- payroll deductions mapped consistently
- uploaded template examples available as reference samples

Key risks:

- supervisor uploads may introduce dirty Excel data
- tenant-specific custom formats can grow if mapping rules are not normalized
- roster logic can become too payroll-coupled too early
- warning-heavy exports may hide chronic master-data gaps if not surfaced clearly

## Delivery Summary

This roadmap adds two major maturity tracks to Solva HR:

1. a production-grade Robot Cafe roster and shift workflow
2. a maintainable internal statutory export architecture with configurable mappings

Together, these move the platform from strong HR/payroll operations into more complete day-to-day workforce execution.
