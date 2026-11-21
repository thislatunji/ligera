import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { importCsv } from "@/lib/services/catalog/csv";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const content = await file.text();
    const result = await importCsv(content, file.size);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "IMPORT_ERROR") {
      return NextResponse.json({ error: error.message, code: "IMPORT_ERROR" }, { status: 400 });
    }
    if (error.code === "IMPORT_ROW_ERROR") {
      return NextResponse.json(error, { status: 422 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
