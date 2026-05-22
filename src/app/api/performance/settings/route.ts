import { NextResponse } from "next/server";
import { getPerformanceWorkspace, updatePerformanceSettings } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ settings: workspace.settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updatePerformanceSettings({
      payrollAdminVisibilityEnabled:
        typeof body.payrollAdminVisibilityEnabled === "boolean"
          ? body.payrollAdminVisibilityEnabled
          : undefined,
      payrollAdminActionEnabled:
        typeof body.payrollAdminActionEnabled === "boolean"
          ? body.payrollAdminActionEnabled
          : undefined,
      kpiCategories: Array.isArray(body.kpiCategories)
        ? body.kpiCategories.filter((item): item is string => typeof item === "string")
        : undefined,
      helpContent:
        body.helpContent && typeof body.helpContent === "object" && !Array.isArray(body.helpContent)
          ? (body.helpContent as Record<string, unknown>)
          : undefined,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
