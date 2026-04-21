import { NextResponse } from "next/server";
import { getModuleByKey } from "@/lib/solva-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ moduleKey: string }> }
) {
  const { moduleKey } = await context.params;
  const module = getModuleByKey(moduleKey);

  if (!module) {
    return NextResponse.json({ error: "module_not_found" }, { status: 404 });
  }

  return NextResponse.json(module);
}
