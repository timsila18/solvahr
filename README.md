# Solva HR

Solva HR is a modern Kenyan cloud-based HR and Payroll Management System designed for private companies, consultancies, SMEs, large organizations, and multi-branch operations.

This fresh rebuild is focused on a premium, visual SaaS experience inspired by FaidiHR, GHRIS, and HRIS-Ke, but cleaner and more flexible:

- Blue, white, and black product branding
- Responsive desktop and mobile shell
- Light mode and dark mode
- Modern sidebar navigation and top search
- Card dashboards, charts, filters, and export-style tables
- Detailed module structure for HR, payroll, leave, recruitment, performance, training, assets, ESS, reports, settings, audit, integrations, and consultancy operations
- Kenyan payroll-oriented content including SHIF, NSSF, Housing Levy, PAYE, P9/P10, net-to-bank, and compliance reporting views

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

## Run locally

```bash
npm install --ignore-scripts
npm run build
npm run dev
```

Then open:

```text
http://127.0.0.1:3000
```

## Current focus

The current app is a strong product shell and design foundation for:

1. Dashboard
2. People / Employee Management
3. Payroll
4. Leave & Attendance
5. Recruitment
6. Performance Management
7. Training & Development
8. Assets Management
9. Employee Self Service
10. Reports
11. Settings
12. Audit Trail
13. Integrations
14. Multi-company / Consultancy Dashboard

## Vercel deployment

Once the Vercel CLI is authenticated on the machine:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

## Notes

- The app currently uses rich realistic Kenyan demo data in the UI shell.
- Next steps are wiring this shell into real HR, payroll, and Supabase-backed API workflows.
