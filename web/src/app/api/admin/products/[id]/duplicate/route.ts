import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { duplicateProduct } from "@/lib/services/catalog/admin";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await duplicateProduct(params.id, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that product.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
