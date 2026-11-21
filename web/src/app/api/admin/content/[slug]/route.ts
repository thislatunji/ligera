import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getContentPage, updateContentPage } from "@/lib/services/admin/content";
import { ContentPageInput } from "@/lib/api/schemas/admin";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const page = await getContentPage(params.slug, true);
    return NextResponse.json(page, { status: 200 });
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = ContentPageInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    const page = await updateContentPage(params.slug, parsed.data, auth.userId);
    return NextResponse.json(page, { status: 200 });
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
    if (error.code === "VALIDATION_ERROR") {
      return NextResponse.json({ error: error.message || "Validation failed.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
