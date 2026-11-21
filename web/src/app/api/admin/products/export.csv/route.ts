import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { exportCsv } from "@/lib/services/catalog/csv";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const csv = await exportCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="products.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
