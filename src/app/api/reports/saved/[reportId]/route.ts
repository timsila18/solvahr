import { NextResponse } from "next/server";
import {
  editSavedReportTemplate,
  updateReportTemplateRecord,
} from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await context.params;
    const body = (await request.json()) as {
      action?: "favorite" | "clone" | "delete";
      name?: string;
      description?: string;
      definition?: Record<string, unknown>;
      visibility?: string;
    };

    if (body.action) {
      return NextResponse.json(
        await updateReportTemplateRecord({
          templateId: reportId,
          action: body.action,
        })
      );
    }

    return NextResponse.json(
      await editSavedReportTemplate({
        templateId: reportId,
        name: body.name,
        description: body.description,
        definition: body.definition,
        visibility: body.visibility,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
