import { NextResponse } from "next/server";
import { roleCanAccessModule } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/session";
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

  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (profile.role === "Employee" && module.key !== "ess") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!roleCanAccessModule(profile.role, module.key)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(module);
}
