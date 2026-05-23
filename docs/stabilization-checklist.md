# Solva HR Stabilization Checklist

Use this checklist before calling a slice ready for testing:

## Authentication

- Login succeeds with a valid role account
- Invalid login shows a visible error
- Logout clears the session and redirects to `/login`
- Refreshing a protected route keeps the session when valid
- Expired or missing session redirects to `/login`
- Unauthorized routes render the access fallback cleanly

## Shared Shell

- Sidebar navigation opens the correct module
- Module submenu opens the correct page
- Top-bar approvals button opens pending approvals
- Profile chip opens employee self-service settings
- Theme toggle works
- Shared data table search works
- Shared data table CSV export works
- Shared data table pagination works

## Core Actions

- Every visible button is functional, disabled intentionally, or hidden
- Save, submit, approve, reject, cancel, create, edit, delete, upload, export, and download actions show feedback
- Destructive actions ask for confirmation where needed
- Placeholder actions show a clear disabled state or “coming soon” treatment

## Role Checks

- Super Admin can access all admin modules
- HR Admin can manage people and HR operations
- Payroll Admin can access payroll review and exports
- Finance Officer can access finance/payroll oversight
- Manager can access team-facing views and approvals
- Employee sees only self-service scope
- Auditor sees read-only audit/reporting scope

## Regression Commands

- `npx tsc --noEmit`
- `node scripts/audit-ui-actions.mjs`
- `npx next build --webpack`
