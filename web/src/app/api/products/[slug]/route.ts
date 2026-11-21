import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/services/catalog/queries";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const product = await getProductBySlug(params.slug);
    if (!product) {
      return NextResponse.json({ error: "We couldn't find that product.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(product, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
