import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { Category } from "@/lib/db/models/category";
import { Product } from "@/lib/db/models/product";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { CategoryInput } from "@/lib/api/schemas/catalog";
import mongoose from "mongoose";
import { slugify } from "@/lib/utils/slug";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;
  try {
    await connectDb();
    const [cats, productRefs] = await Promise.all([
      Category.find({}).sort({ sortOrder: 1, name: 1 }).lean(),
      Product.find({}, { categoryId: 1, spaceTagIds: 1 }).lean(),
    ]);
    const counts = new Map<string, number>();
    for (const p of productRefs as any[]) {
      const seen = new Set<string>();
      if (p.categoryId) seen.add(p.categoryId.toString());
      if (Array.isArray(p.spaceTagIds)) {
        for (const s of p.spaceTagIds) {
          if (s) seen.add(s.toString());
        }
      }
      for (const cid of seen) {
        counts.set(cid, (counts.get(cid) || 0) + 1);
      }
    }
    const enriched = cats.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      productCount: counts.get(c._id.toString()) || 0,
    }));
    return NextResponse.json(enriched, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    await connectDb();
    const body = await request.json();
    const parsed = CategoryInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const slug = slugify(parsed.data.name);
    const existing = await Category.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken.", code: "SLUG_TAKEN" }, { status: 409 });
    }
    const cat = await Category.create({
      name: parsed.data.name,
      slug,
      type: parsed.data.type,
      parentId: parsed.data.parentId ? new mongoose.Types.ObjectId(parsed.data.parentId) : null,
      description: parsed.data.description || "",
      image: parsed.data.image || null,
      active: parsed.data.active !== false,
      sortOrder: parsed.data.sortOrder || 0,
    });
    try {
      await ActivityLog.create({
        userId: new mongoose.Types.ObjectId(auth.userId),
        action: "category.create",
        entity: { type: "category", id: cat._id.toString() },
        before: null,
        after: cat.toObject(),
      });
    } catch (e) {}
    return NextResponse.json(cat, { status: 201 });
  } catch (error: any) {
    if (error.code === "SLUG_TAKEN") {
      return NextResponse.json({ error: "Slug already taken.", code: "SLUG_TAKEN" }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
