import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getLowStock } from "@/lib/services/catalog/stock";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const threshold = searchParams.get("threshold");
    const result = await getLowStock(threshold ? parseInt(threshold) : undefined);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
