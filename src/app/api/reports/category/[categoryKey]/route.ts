import { NextResponse } from "next/server";
import {
  getAssetReportsSnapshot,
  getAttendanceReportsSnapshot,
  getBranchReportsSnapshot,
  getComplianceReportsSnapshot,
  getConsultancyReportsSnapshot,
  getDepartmentReportsSnapshot,
  getExecutiveDashboardReport,
  getHrReportsSnapshot,
  getLeaveReportsCategorySnapshot,
  getPayrollReportsSnapshot,
  getRecruitmentReportsSnapshot,
  getTrainingReportsSnapshot,
} from "@/lib/database";
import { getPerformanceReportsSnapshot } from "@/lib/performance-management";

export async function GET(
  _request: Request,
  context: { params: Promise<{ categoryKey: string }> }
) {
  try {
    const { categoryKey } = await context.params;

    const payload = await (async () => {
      switch (categoryKey) {
        case "executive-dashboard":
          return { report: await getExecutiveDashboardReport() };
        case "operations-health":
          return { report: await getExecutiveDashboardReport() };
        case "hr":
          return { report: await getHrReportsSnapshot() };
        case "payroll":
          return { report: await getPayrollReportsSnapshot() };
        case "leave":
          return { report: await getLeaveReportsCategorySnapshot() };
        case "attendance":
          return { report: await getAttendanceReportsSnapshot() };
        case "recruitment":
          return { report: await getRecruitmentReportsSnapshot() };
        case "performance":
          return { report: await getPerformanceReportsSnapshot() };
        case "training":
          return { report: await getTrainingReportsSnapshot() };
        case "assets":
          return { report: await getAssetReportsSnapshot() };
        case "compliance":
          return { report: await getComplianceReportsSnapshot() };
        case "branch":
          return { report: await getBranchReportsSnapshot() };
        case "department":
          return { report: await getDepartmentReportsSnapshot() };
        case "consultancy":
          return { report: await getConsultancyReportsSnapshot() };
        default:
          return null;
      }
    })();

    if (!payload) {
      return NextResponse.json({ error: "report_category_not_found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
