import { NextRequest, NextResponse } from "next/server";
import { getContentPage } from "@/lib/services/admin/content";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const page = await getContentPage(params.slug, false);
    return NextResponse.json(page, { status: 200 }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate" } } as any);
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
