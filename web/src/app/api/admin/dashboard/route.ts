import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getDashboardSnapshot } from "@/lib/services/admin/dashboard";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "today") as "today" | "7d" | "30d";
    if (period !== "today" && period !== "7d" && period !== "30d") {
      return NextResponse.json({ error: "Invalid period", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const snapshot = await getDashboardSnapshot(period);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
