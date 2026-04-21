import { NextResponse } from "next/server";
import { listLeaveBalances, listLeaveRequests } from "@/lib/database";

export async function GET() {
  try {
    const [requests, balances] = await Promise.all([listLeaveRequests(), listLeaveBalances()]);
    return NextResponse.json({ requests, balances });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
