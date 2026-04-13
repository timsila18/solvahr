# API Surface

## Current Scaffold Endpoints

- `GET /health`
- `GET /ready`
- `GET /api/dashboard`
- `GET /api/companies`
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/leave/types`
- `GET /api/leave/requests`
- `POST /api/leave/requests`
- `POST /api/leave/requests/:id/approve`
- `POST /api/leave/requests/:id/reject`
- `GET /api/recruitment/requisitions`
- `GET /api/recruitment/vacancies`
- `GET /api/recruitment/candidates`
- `POST /api/recruitment/candidates`
- `GET /api/recruitment/interviews`
- `GET /api/recruitment/offers`
- `POST /api/recruitment/offers/:id/approve`
- `GET /api/onboarding/tasks`
- `GET /api/probation/reviews`
- `GET /api/documents/templates`
- `GET /api/documents/generated`
- `GET /api/payroll/runs/current`
- `POST /api/payroll/runs/current/approve`
- `GET /api/reports/templates`
- `GET /api/settings/catalogues`

## Planned Endpoint Families

- `/api/auth/*`
- `/api/companies/*`
- `/api/organization/*`
- `/api/employees/*`
- `/api/leave/*`
- `/api/payroll/*`
- `/api/recruitment/*`
- `/api/performance/*`
- `/api/welfare/*`
- `/api/discipline/*`
- `/api/reports/*`
- `/api/audit-logs/*`

All tenant-owned endpoints must resolve the active tenant from the authenticated user, not from user-submitted request bodies.

## Staging Auth Context

Until full JWT login is implemented, staging accepts these headers to simulate tenant and user context:

- `x-tenant-id`
- `x-user-id`
- `x-user-email`
- `x-user-roles`

If omitted, the API uses a demo company-admin context. Sensitive writes are already permission-checked with the shared RBAC matrix.
