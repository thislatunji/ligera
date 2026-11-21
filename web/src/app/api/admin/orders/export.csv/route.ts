import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { ExportQuery } from "@/lib/api/schemas/orders";
import { exportOrdersCSV } from "@/lib/services/orders/export-csv";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner can export orders.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return auth;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }

    const parsed = ExportQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    const csv = await exportOrdersCSV(parsed.data, auth);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="orders.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
