import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

const DEFAULT_COMPANY_SLUG = "robot-cafe-bistro";

export async function loadLocalEnv() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore local env loading when not available
  }
}

function readEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function nestedField(value, field) {
  const object = asObject(value);
  if (!object) {
    return "";
  }
  return safeString(object[field]);
}

function buildSupabaseAdmin() {
  return createClient(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

const readOnlyAnnotations = {
  title: "Solva HR Read-Only Tool",
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
};

function textResult(summary, structuredContent) {
  return {
    content: [{ type: "text", text: summary }],
    structuredContent,
  };
}

export function createSolvaMcpServer() {
  const server = new McpServer({
    name: "solva-hr-mcp-server",
    version: "0.1.0",
    websiteUrl: "https://solvahr.co.ke",
  });

  const companyCache = new Map();

  async function resolveCompany(slug = DEFAULT_COMPANY_SLUG) {
    const normalizedSlug = safeString(slug, DEFAULT_COMPANY_SLUG);
    if (companyCache.has(normalizedSlug)) {
      return companyCache.get(normalizedSlug);
    }
    const admin = buildSupabaseAdmin();
    const { data, error } = await admin
      .from("companies")
      .select("id, name, slug, status")
      .eq("slug", normalizedSlug)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error(`company_not_found:${normalizedSlug}`);
    }
    companyCache.set(normalizedSlug, data);
    return data;
  }

  server.registerTool(
    "list_companies",
    {
      title: "List companies",
      description: "List companies available in Solva HR, optionally filtered by status.",
      inputSchema: {
        status: z.string().optional().describe("Optional company status filter such as active or inactive."),
      },
      outputSchema: {
        count: z.number(),
        companies: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            status: z.string(),
          })
        ),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ status }) => {
      const admin = buildSupabaseAdmin();
      let query = admin.from("companies").select("id, name, slug, status").order("name");
      if (safeString(status)) {
        query = query.eq("status", safeString(status));
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const companies = (data ?? []).map((entry) => ({
        id: safeString(entry.id),
        name: safeString(entry.name),
        slug: safeString(entry.slug),
        status: safeString(entry.status),
      }));
      return textResult(`Found ${companies.length} compan${companies.length === 1 ? "y" : "ies"} in Solva HR.`, {
        count: companies.length,
        companies,
      });
    }
  );

  server.registerTool(
    "search_employees",
    {
      title: "Search employees",
      description: "Search employees within a company by employee number or name and return a light work-profile summary.",
      inputSchema: {
        company_slug: z.string().optional().describe("Company slug. Defaults to robot-cafe-bistro."),
        query: z.string().describe("Employee number or part of the employee's name."),
        limit: z.number().int().min(1).max(25).optional().describe("Maximum number of matching employees to return."),
      },
      outputSchema: {
        company: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        }),
        count: z.number(),
        employees: z.array(
          z.object({
            employee_number: z.string(),
            full_name: z.string(),
            designation: z.string(),
            department: z.string(),
            branch: z.string(),
            employment_type: z.string(),
            status: z.string(),
            email: z.string(),
            phone: z.string(),
          })
        ),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ company_slug, query, limit }) => {
      const company = await resolveCompany(company_slug);
      const admin = buildSupabaseAdmin();
      const search = safeString(query);
      const max = safeNumber(limit, 8);
      const orFilter = [
        `employee_number.ilike.%${search}%`,
        `first_name.ilike.%${search}%`,
        `last_name.ilike.%${search}%`,
        `email.ilike.%${search}%`,
      ].join(",");
      const { data, error } = await admin
        .from("employees")
        .select(`
          employee_number,
          first_name,
          last_name,
          email,
          phone,
          employment_type,
          status,
          designation:designations!employees_designation_id_fkey(title),
          department:departments!employees_department_id_fkey(name),
          branch:branches!employees_branch_id_fkey(name)
        `)
        .eq("company_id", company.id)
        .or(orFilter)
        .order("employee_number")
        .limit(max);
      if (error) {
        throw error;
      }
      const employees = (data ?? []).map((entry) => ({
        employee_number: safeString(entry.employee_number),
        full_name: [safeString(entry.first_name), safeString(entry.last_name)].filter(Boolean).join(" "),
        designation: nestedField(entry.designation, "title"),
        department: nestedField(entry.department, "name"),
        branch: nestedField(entry.branch, "name"),
        employment_type: safeString(entry.employment_type),
        status: safeString(entry.status),
        email: safeString(entry.email),
        phone: safeString(entry.phone),
      }));
      return textResult(`Found ${employees.length} matching employee record${employees.length === 1 ? "" : "s"} in ${company.name}.`, {
        company: {
          id: safeString(company.id),
          name: safeString(company.name),
          slug: safeString(company.slug),
        },
        count: employees.length,
        employees,
      });
    }
  );

  server.registerTool(
    "get_employee_profile",
    {
      title: "Get employee profile",
      description: "Return a concise employee work profile, latest payroll snapshot, and supervisor information for one employee.",
      inputSchema: {
        company_slug: z.string().optional().describe("Company slug. Defaults to robot-cafe-bistro."),
        employee_number: z.string().describe("Employee number such as RC-001."),
      },
      outputSchema: {
        found: z.boolean(),
        employee: z
          .object({
            employee_number: z.string(),
            full_name: z.string(),
            email: z.string(),
            phone: z.string(),
            status: z.string(),
            employment_type: z.string(),
            hire_date: z.string(),
            branch: z.string(),
            department: z.string(),
            designation: z.string(),
            supervisor_name: z.string(),
            latest_payroll: z.object({
              period_label: z.string(),
              payroll_type: z.string(),
              gross_pay: z.number(),
              net_pay: z.number(),
              run_status: z.string(),
            }),
          })
          .nullable(),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ company_slug, employee_number }) => {
      const company = await resolveCompany(company_slug);
      const admin = buildSupabaseAdmin();
      const { data, error } = await admin
        .from("employees")
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          email,
          phone,
          status,
          employment_type,
          hire_date,
          branch:branches!employees_branch_id_fkey(name),
          department:departments!employees_department_id_fkey(name),
          designation:designations!employees_designation_id_fkey(title),
          supervisor:employees!employees_supervisor_employee_id_fkey(first_name,last_name)
        `)
        .eq("company_id", company.id)
        .eq("employee_number", safeString(employee_number))
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return textResult(`No employee was found for ${employee_number} in ${company.name}.`, {
          found: false,
          employee: null,
        });
      }

      const { data: payrollRow, error: payrollError } = await admin
        .from("payroll_employees")
        .select(`
          gross_pay,
          net_pay,
          payroll_run:payroll_runs!payroll_employees_payroll_run_id_fkey(period_label,payroll_type,status,processed_at,created_at)
        `)
        .eq("employee_id", data.id)
        .order("created_at", { foreignTable: "payroll_runs", ascending: false })
        .limit(1)
        .maybeSingle();
      if (payrollError) {
        throw payrollError;
      }

      const latestRun = asObject(payrollRow?.payroll_run);
      const employee = {
        employee_number: safeString(data.employee_number),
        full_name: [safeString(data.first_name), safeString(data.last_name)].filter(Boolean).join(" "),
        email: safeString(data.email),
        phone: safeString(data.phone),
        status: safeString(data.status),
        employment_type: safeString(data.employment_type),
        hire_date: safeString(data.hire_date),
        branch: nestedField(data.branch, "name"),
        department: nestedField(data.department, "name"),
        designation: nestedField(data.designation, "title"),
        supervisor_name: [nestedField(data.supervisor, "first_name"), nestedField(data.supervisor, "last_name")].filter(Boolean).join(" "),
        latest_payroll: {
          period_label: safeString(latestRun?.period_label),
          payroll_type: safeString(latestRun?.payroll_type),
          gross_pay: safeNumber(payrollRow?.gross_pay),
          net_pay: safeNumber(payrollRow?.net_pay),
          run_status: safeString(latestRun?.status),
        },
      };

      return textResult(`Loaded the work profile for ${employee.full_name} (${employee.employee_number}).`, {
        found: true,
        employee,
      });
    }
  );

  server.registerTool(
    "list_pending_approvals",
    {
      title: "List pending approvals",
      description: "List pending approval tasks by company, optional owner role, and optional module.",
      inputSchema: {
        company_slug: z.string().optional().describe("Company slug. Defaults to robot-cafe-bistro."),
        owner_role: z
          .enum(["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Manager", "Recruiter", "Employee", "Auditor", "Operator", "Supervisor"])
          .optional()
          .describe("Optional owner role filter."),
        module_key: z.string().optional().describe("Optional module filter such as payroll, leave, or people."),
        limit: z.number().int().min(1).max(25).optional().describe("Maximum number of tasks to return."),
      },
      outputSchema: {
        company: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        }),
        count: z.number(),
        tasks: z.array(
          z.object({
            id: z.string(),
            module_key: z.string(),
            title: z.string(),
            description: z.string(),
            owner_role: z.string(),
            stage: z.string(),
            status: z.string(),
            due_at: z.string(),
            requested_by_email: z.string(),
            requested_by_role: z.string(),
            created_at: z.string(),
          })
        ),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ company_slug, owner_role, module_key, limit }) => {
      const company = await resolveCompany(company_slug);
      const admin = buildSupabaseAdmin();
      let query = admin
        .from("approval_tasks")
        .select("id,module_key,title,description,owner_role,stage,status,due_at,created_at,requester:requested_by(email,role)")
        .eq("company_id", company.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(safeNumber(limit, 10));
      if (safeString(owner_role)) {
        query = query.eq("owner_role", safeString(owner_role));
      }
      if (safeString(module_key)) {
        query = query.eq("module_key", safeString(module_key));
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const tasks = (data ?? []).map((entry) => ({
        id: safeString(entry.id),
        module_key: safeString(entry.module_key),
        title: safeString(entry.title),
        description: safeString(entry.description),
        owner_role: safeString(entry.owner_role),
        stage: safeString(entry.stage),
        status: safeString(entry.status),
        due_at: safeString(entry.due_at),
        requested_by_email: nestedField(entry.requester, "email"),
        requested_by_role: nestedField(entry.requester, "role"),
        created_at: safeString(entry.created_at),
      }));
      return textResult(`Found ${tasks.length} pending approval task${tasks.length === 1 ? "" : "s"} in ${company.name}.`, {
        company: {
          id: safeString(company.id),
          name: safeString(company.name),
          slug: safeString(company.slug),
        },
        count: tasks.length,
        tasks,
      });
    }
  );

  server.registerTool(
    "get_payroll_run_summary",
    {
      title: "Get payroll run summary",
      description: "Return summary totals for the latest or requested payroll run in a company.",
      inputSchema: {
        company_slug: z.string().optional().describe("Company slug. Defaults to robot-cafe-bistro."),
        period_label: z.string().optional().describe("Optional payroll period label such as Apr 2026."),
        payroll_type: z.string().optional().describe("Optional payroll type filter such as 15th Payroll or Full Month."),
        status: z.string().optional().describe("Optional payroll run status filter."),
      },
      outputSchema: {
        found: z.boolean(),
        payroll_run: z
          .object({
            id: z.string(),
            period_label: z.string(),
            payroll_type: z.string(),
            status: z.string(),
            gross_pay: z.number(),
            net_pay: z.number(),
            total_deductions: z.number(),
            employer_cost: z.number(),
            paye_total: z.number(),
            shif_total: z.number(),
            housing_levy_total: z.number(),
            nssf_total: z.number(),
            pension_total: z.number(),
            validation_errors: z.number(),
            processed_at: z.string(),
          })
          .nullable(),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ company_slug, period_label, payroll_type, status }) => {
      const company = await resolveCompany(company_slug);
      const admin = buildSupabaseAdmin();
      let query = admin
        .from("payroll_runs")
        .select("id,period_label,payroll_type,status,gross_pay,net_pay,total_deductions,employer_cost,paye_total,shif_total,housing_levy_total,nssf_total,pension_total,validation_errors,processed_at,created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (safeString(period_label)) {
        query = query.eq("period_label", safeString(period_label));
      }
      if (safeString(payroll_type)) {
        query = query.eq("payroll_type", safeString(payroll_type));
      }
      if (safeString(status)) {
        query = query.eq("status", safeString(status));
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return textResult(`No payroll run matched the filters for ${company.name}.`, {
          found: false,
          payroll_run: null,
        });
      }
      const payrollRun = {
        id: safeString(data.id),
        period_label: safeString(data.period_label),
        payroll_type: safeString(data.payroll_type),
        status: safeString(data.status),
        gross_pay: safeNumber(data.gross_pay),
        net_pay: safeNumber(data.net_pay),
        total_deductions: safeNumber(data.total_deductions),
        employer_cost: safeNumber(data.employer_cost),
        paye_total: safeNumber(data.paye_total),
        shif_total: safeNumber(data.shif_total),
        housing_levy_total: safeNumber(data.housing_levy_total),
        nssf_total: safeNumber(data.nssf_total),
        pension_total: safeNumber(data.pension_total),
        validation_errors: safeNumber(data.validation_errors),
        processed_at: safeString(data.processed_at),
      };
      return textResult(`Loaded payroll summary for ${payrollRun.period_label} ${payrollRun.payroll_type}.`, {
        found: true,
        payroll_run: payrollRun,
      });
    }
  );

  server.registerTool(
    "get_leave_balance_summary",
    {
      title: "Get leave balance summary",
      description: "Return the current leave balances and recent pending requests for one employee.",
      inputSchema: {
        company_slug: z.string().optional().describe("Company slug. Defaults to robot-cafe-bistro."),
        employee_number: z.string().describe("Employee number such as RC-001."),
      },
      outputSchema: {
        found: z.boolean(),
        employee: z
          .object({
            employee_number: z.string(),
            full_name: z.string(),
            balances: z.array(
              z.object({
                leave_type: z.string(),
                opening_balance: z.number(),
                accrued_days: z.number(),
                taken_days: z.number(),
                pending_days: z.number(),
                balance_days: z.number(),
                as_of_date: z.string(),
              })
            ),
            pending_requests: z.array(
              z.object({
                leave_type: z.string(),
                start_date: z.string(),
                end_date: z.string(),
                days: z.number(),
                status: z.string(),
              })
            ),
          })
          .nullable(),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ company_slug, employee_number }) => {
      const company = await resolveCompany(company_slug);
      const admin = buildSupabaseAdmin();
      const { data: employee, error: employeeError } = await admin
        .from("employees")
        .select("id, employee_number, first_name, last_name")
        .eq("company_id", company.id)
        .eq("employee_number", safeString(employee_number))
        .maybeSingle();
      if (employeeError) {
        throw employeeError;
      }
      if (!employee) {
        return textResult(`No employee was found for ${employee_number} in ${company.name}.`, {
          found: false,
          employee: null,
        });
      }

      const [{ data: balances, error: balancesError }, { data: requests, error: requestsError }] = await Promise.all([
        admin
          .from("leave_balances")
          .select("leave_type, opening_balance, accrued_days, taken_days, pending_days, balance_days, as_of_date")
          .eq("employee_id", employee.id)
          .order("as_of_date", { ascending: false }),
        admin
          .from("leave_requests")
          .select("leave_type, start_date, end_date, days, status, created_at")
          .eq("employee_id", employee.id)
          .in("status", ["pending", "approved"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (balancesError) {
        throw balancesError;
      }
      if (requestsError) {
        throw requestsError;
      }

      const balanceRows = (balances ?? []).map((entry) => ({
        leave_type: safeString(entry.leave_type),
        opening_balance: safeNumber(entry.opening_balance),
        accrued_days: safeNumber(entry.accrued_days),
        taken_days: safeNumber(entry.taken_days),
        pending_days: safeNumber(entry.pending_days),
        balance_days: safeNumber(entry.balance_days),
        as_of_date: safeString(entry.as_of_date),
      }));
      const requestRows = (requests ?? []).map((entry) => ({
        leave_type: safeString(entry.leave_type),
        start_date: safeString(entry.start_date),
        end_date: safeString(entry.end_date),
        days: safeNumber(entry.days),
        status: safeString(entry.status),
      }));
      return textResult(`Loaded ${balanceRows.length} leave balance row${balanceRows.length === 1 ? "" : "s"} for ${employee.first_name} ${employee.last_name}.`, {
        found: true,
        employee: {
          employee_number: safeString(employee.employee_number),
          full_name: [safeString(employee.first_name), safeString(employee.last_name)].filter(Boolean).join(" "),
          balances: balanceRows,
          pending_requests: requestRows,
        },
      });
    }
  );

  return server;
}
