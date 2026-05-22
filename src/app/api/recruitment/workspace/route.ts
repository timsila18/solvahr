import { NextResponse } from "next/server";
import { createRequisitionApprovalRequest, getRecruitmentWorkspace } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ workspace: await getRecruitmentWorkspace() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roleTitle?: string;
      headcount?: string;
    };

    if (!body.roleTitle || !body.headcount) {
      return NextResponse.json({ error: "missing_requisition_fields" }, { status: 400 });
    }

    return NextResponse.json(
      await createRequisitionApprovalRequest({
        roleTitle: body.roleTitle,
        headcount: body.headcount,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
