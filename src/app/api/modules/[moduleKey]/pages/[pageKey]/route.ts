import { NextResponse } from "next/server";
import { buildPageFromDatabase } from "@/lib/database";
import { getModuleByKey } from "@/lib/solva-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ moduleKey: string; pageKey: string }> }
) {
  const { moduleKey, pageKey } = await context.params;
  const module = getModuleByKey(moduleKey);

  if (!module) {
    return NextResponse.json({ error: "module_not_found" }, { status: 404 });
  }

  const item = module.items.find(
    (entry) => entry.toLowerCase().replace(/[^a-z0-9]+/g, "-") === pageKey
  );

  if (!item) {
    return NextResponse.json({ error: "page_not_found" }, { status: 404 });
  }

  try {
    return NextResponse.json(await buildPageFromDatabase(module, item));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
