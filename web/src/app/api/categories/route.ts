import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/lib/services/catalog/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const result = await getCategories(type || undefined);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
