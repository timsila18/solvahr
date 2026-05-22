import { NextResponse } from "next/server";
import { registerEmployerOrganization } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const logoEntry = form.get("logo");
    const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
    const selectedModulesRaw = String(form.get("selectedModules") ?? "[]");
    const selectedModules = (() => {
      try {
        const parsed = JSON.parse(selectedModulesRaw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      } catch {
        return [];
      }
    })();

    const account = await registerEmployerOrganization({
      organizationName: String(form.get("organizationName") ?? ""),
      employerIdentifier: String(form.get("employerIdentifier") ?? ""),
      companyEmail: String(form.get("companyEmail") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      country: String(form.get("country") ?? "Kenya"),
      timezone: String(form.get("timezone") ?? "Africa/Nairobi"),
      payrollCurrency: String(form.get("payrollCurrency") ?? "KES"),
      adminFullName: String(form.get("adminFullName") ?? ""),
      adminEmail: String(form.get("adminEmail") ?? ""),
      adminPassword: String(form.get("adminPassword") ?? ""),
      logoFile,
      planId: String(form.get("planId") ?? "growth"),
      billingCycle: String(form.get("billingCycle") ?? "monthly") === "annual" ? "annual" : "monthly",
      estimatedEmployeeCount: Number(form.get("estimatedEmployeeCount") ?? 0),
      selectedModules,
      trialDays: Number(form.get("trialDays") ?? 0) || null,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "missing_employer_signup_fields" ||
      message === "plan_not_found" ||
      message === "logo_file_type_not_supported"
        ? 400
        : message === "admin_email_already_exists"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
