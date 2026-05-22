import { NextResponse } from "next/server";
import { createSalesLead } from "@/lib/saas";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      leadType: "contact_sales" | "book_demo";
      companyName: string;
      contactPerson: string;
      email: string;
      phone?: string | null;
      employeeCount?: number | null;
      modules?: string[];
      preferredDate?: string | null;
      country?: string | null;
      notes?: string | null;
    };

    return NextResponse.json(
      {
        lead: await createSalesLead(body),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "missing_lead_fields" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
