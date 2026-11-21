import { NextRequest, NextResponse } from "next/server";
import { suggest } from "@/lib/services/catalog/suggest";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const result = await suggest(q);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
