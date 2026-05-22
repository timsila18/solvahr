import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_OPENAI_CHALLENGE_PATH = "openai-apps-challenge";
const DEFAULT_OPENAI_CHALLENGE_TOKEN = "V2r3LoDsS8OFFnNXm9Vz74Xf-HNz8aPXPj2byOMX6ts";

function normalizePath(parts: string[] | undefined) {
  return Array.isArray(parts) ? parts.join("/") : "";
}

export async function GET(_request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const params = await context.params;
  const requestedPath = normalizePath(params.slug);
  const configuredPath = (process.env.OPENAI_DOMAIN_VERIFICATION_PATH ?? DEFAULT_OPENAI_CHALLENGE_PATH).replace(/^\/+/, "");
  const token = process.env.OPENAI_DOMAIN_VERIFICATION_TOKEN ?? DEFAULT_OPENAI_CHALLENGE_TOKEN;

  if (!configuredPath || !token || requestedPath !== configuredPath) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(`${token}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
