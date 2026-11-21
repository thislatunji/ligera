import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { Category } from "@/lib/db/models/category";
import { Product } from "@/lib/db/models/product";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { CategoryInput } from "@/lib/api/schemas/catalog";
import mongoose from "mongoose";
import { slugify } from "@/lib/utils/slug";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    await connectDb();
    const body = await request.json();
    const parsed = CategoryInput.partial().safeParse(body);
    const cat = await Category.findById(params.id);
    if (!cat) {
      return NextResponse.json({ error: "We couldn't find that category.", code: "NOT_FOUND" }, { status: 404 });
    }
    const before = cat.toObject();
    if (body.name) {
      const slug = slugify(body.name);
      const existing = await Category.findOne({ slug, _id: { $ne: cat._id } });
      if (existing) {
        return NextResponse.json({ error: "Slug already taken.", code: "SLUG_TAKEN" }, { status: 409 });
      }
      cat.name = body.name;
      cat.slug = slug;
    }
    if (body.type !== undefined) cat.type = body.type;
    if (body.parentId !== undefined) cat.parentId = body.parentId ? new mongoose.Types.ObjectId(body.parentId) : null;
    if (body.description !== undefined) cat.description = body.description;
    if (body.image !== undefined) cat.image = body.image;
    if (body.active !== undefined) cat.active = body.active;
    if (body.sortOrder !== undefined) cat.sortOrder = body.sortOrder;
    await cat.save();
    try {
      await ActivityLog.create({
        userId: new mongoose.Types.ObjectId(auth.userId),
        action: "category.update",
        entity: { type: "category", id: cat._id.toString() },
        before,
        after: cat.toObject(),
      });
    } catch (e) {}
    return NextResponse.json(cat, { status: 200 });
  } catch (error: any) {
    if (error.code === "SLUG_TAKEN") {
      return NextResponse.json({ error: "Slug already taken.", code: "SLUG_TAKEN" }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    await connectDb();
    const cat = await Category.findById(params.id);
    if (!cat) {
      return NextResponse.json({ error: "We couldn't find that category.", code: "NOT_FOUND" }, { status: 404 });
    }
    // Check if products use this category
    const products = await Product.countDocuments({ $or: [{ categoryId: cat._id }, { spaceTagIds: cat._id }] });
    if (products > 0) {
      return NextResponse.json({ error: "Category is in use by products.", code: "CATEGORY_IN_USE" }, { status: 409 });
    }
    const before = cat.toObject();
    await Category.findByIdAndDelete(params.id);
    try {
      await ActivityLog.create({
        userId: new mongoose.Types.ObjectId(auth.userId),
        action: "category.delete",
        entity: { type: "category", id: cat._id.toString() },
        before,
        after: null,
      });
    } catch (e) {}
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error.code === "CATEGORY_IN_USE") {
      return NextResponse.json({ error: "Category is in use by products.", code: "CATEGORY_IN_USE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
