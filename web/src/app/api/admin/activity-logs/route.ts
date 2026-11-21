import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listActivityLogs } from "@/lib/services/admin/activity";
import { ActivityLogQuery } from "@/lib/api/schemas/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }
    const parsed = ActivityLogQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    const result = await listActivityLogs(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
