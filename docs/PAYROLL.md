# Payroll Engine Notes

## Design Rules

- Store payroll runs by tenant, period, cycle, pay group, and version.
- Snapshot employee payroll setup before calculation.
- Treat statutory rules as effective-dated configuration.
- Write earnings, deductions, employer costs, exceptions, payslips, and exports as run artifacts.
- Lock approved payrolls before payslip release.
- Use rerun versions rather than mutating an approved run.

## Kenya Version 1 Rule Families

- PAYE monthly graduated bands
- PAYE personal relief
- SHA/SHIF employee contribution
- Affordable Housing Levy employee and employer contribution
- NSSF employee and employer contribution

## Half-Month Payroll

The model supports separate `FIRST_HALF` and `SECOND_HALF` periods. Companies can configure first-half advances, proportional earnings, deferred deductions, split statutory deductions, or full statutory deductions at month end. Month-end reporting should reconcile both cycles into one combined summary.
