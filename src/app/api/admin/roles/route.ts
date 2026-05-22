import { NextResponse } from "next/server";
import { cloneRoleDefinition, createRoleDefinition, listRoleDefinitions } from "@/lib/administration";

export async function GET() {
  try {
    return NextResponse.json({ roles: await listRoleDefinitions() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.mode === "clone") {
      return NextResponse.json(
        {
          role: await cloneRoleDefinition(String(body.roleKey ?? ""), String(body.cloneName ?? "Cloned Role")),
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        role: await createRoleDefinition({
          roleKey: String(body.roleKey ?? ""),
          name: String(body.name ?? ""),
          description: typeof body.description === "string" ? body.description : null,
          scopeType: typeof body.scopeType === "string" ? body.scopeType : null,
          assignable: Boolean(body.assignable),
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
