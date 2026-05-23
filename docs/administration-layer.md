# Solva HR Administration Layer

## What this slice adds

The administration layer turns Solva HR into a product that can be operated by real client admins instead of only being demoed as a functional shell.

Core areas now covered:

- admin dashboard
- user management
- role management
- permissions matrix
- company settings
- branch, department, designation, job grade, and payroll group administration
- approval workflow settings
- notification settings
- security settings
- login sessions
- access logs
- audit oversight
- system health
- data imports

## User lifecycle

Supported account lifecycle actions:

- create user with immediate password
- invite user
- resend invite
- reset password
- activate
- suspend
- deactivate
- reactivate
- force sign out placeholder action
- revoke invite

Login and logout now write to:

- `login_sessions`
- `access_logs`

Blocked user states:

- `suspended`
- `deactivated`
- `revoked`

## Roles supported

- Super Admin
- HR Admin
- Payroll Admin
- Finance Officer
- Manager
- Recruiter
- Employee
- Auditor
- Operator
- Supervisor

## Permission model

The admin matrix stores permissions by:

- role
- module
- scope
- action flags

Supported scopes:

- global
- company-wide
- branch-specific
- department-specific
- team-only
- self-only

Stored action flags:

- `can_view`
- `can_create`
- `can_edit`
- `can_approve`
- `can_export`
- `can_delete`
- `can_admin`

## New admin routes

- `/api/admin/dashboard`
- `/api/admin/users`
- `/api/admin/users/[userId]`
- `/api/admin/users/[userId]/actions`
- `/api/admin/roles`
- `/api/admin/roles/[roleKey]`
- `/api/admin/permissions`
- `/api/admin/company-settings`
- `/api/admin/approval-workflows`
- `/api/admin/notification-settings`
- `/api/admin/security-settings`
- `/api/admin/login-sessions`
- `/api/admin/access-logs`
- `/api/admin/audit-oversight`
- `/api/admin/system-health`
- `/api/admin/imports`
- `/api/admin/reference-data`

## Data import behavior

Bulk import supports:

- employees
- branches
- departments
- designations
- job grades
- payroll groups

The import flow records:

- file name
- import type
- row count
- success count
- failure count
- error summary

## Current placeholders

These are intentionally present but not fully deep yet:

- backup and recovery execution
- force logout across all active devices at Supabase token level
- MFA enforcement beyond config storage
- IP and device fingerprint enrichment
- invite email branding
- background scheduling for recurring admin jobs
- full runtime consumption of custom role templates outside the core app role model

## Notes on enforcement

This slice uses:

- authenticated user identity from Supabase auth
- server-only admin operations through the Supabase service-role client
- admin access checks before running governance actions
- audit and access logging on lifecycle and settings actions

This keeps the admin surface reliable even where regular user-facing RLS policies are stricter.
