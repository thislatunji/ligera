import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/services/catalog/queries";
import { ProductQuery } from "@/lib/api/schemas/catalog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }
    const parsed = ProductQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const result = await listProducts(parsed.data);
    const response = NextResponse.json(result, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
