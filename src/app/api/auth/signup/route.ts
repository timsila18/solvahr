import { NextResponse } from "next/server";
import { registerSelfServiceUser } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName: string;
      email: string;
      password: string;
      phone?: string | null;
    };

    if (!body.fullName || !body.email || !body.password) {
      return NextResponse.json({ error: "missing_signup_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        account: await registerSelfServiceUser(body),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
