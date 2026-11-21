import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { createProduct, updateProduct, updateProductStatus, duplicateProduct, deleteProduct } from "@/lib/services/catalog/admin";
import mongoose from "mongoose";

describe("catalog admin", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    const owner = await User.create({
      name: "Owner",
      email: "owner@test.com",
      passwordHash: "hash",
      role: "owner",
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
    });
    ownerId = owner._id.toString();
  });

  it("creates product with variants and logs activity", async () => {
    const res = await createProduct(
      {
        name: "Test Candle",
        description: "desc",
        categoryId: null,
        spaceTagIds: [],
        scentNotes: { top: [], heart: [], base: [] },
        ingredients: "",
        safetyInfo: "",
        burnTime: "",
        dimensions: "",
        finish: "",
        madeToOrder: false,
        leadTimeDays: 0,
        images: [{ publicId: "img1", alt: "Test candle image", width: 1200, height: 1200, position: 0 }],
        pairsWith: [],
        seo: { title: "", metaDescription: "", ogImage: "" },
        featured: false,
        sortOrder: 0,
        variants: [{ label: "Small", sku: "TEST-S", price: 5000, salePrice: null, lowStockThreshold: 5, costPrice: 2000, active: true }],
      },
      ownerId
    );
    expect(res.id).toBeDefined();
    const log = await ActivityLog.findOne({ action: "product.create" });
    expect(log).toBeDefined();
  });

  it("rejects duplicate SKU", async () => {
    await createProduct(
      {
        name: "Test Candle",
        description: "",
        categoryId: null,
        spaceTagIds: [],
        scentNotes: { top: [], heart: [], base: [] },
        ingredients: "",
        safetyInfo: "",
        burnTime: "",
        dimensions: "",
        finish: "",
        madeToOrder: false,
        leadTimeDays: 0,
        images: [{ publicId: "img1", alt: "Test candle image", width: 1200, height: 1200, position: 0 }],
        pairsWith: [],
        seo: { title: "", metaDescription: "", ogImage: "" },
        featured: false,
        sortOrder: 0,
        variants: [{ label: "Small", sku: "DUP-SKU", price: 5000, salePrice: null, lowStockThreshold: 5, costPrice: 2000, active: true }],
      },
      ownerId
    );
    await expect(
      createProduct(
        {
          name: "Another",
          description: "",
          categoryId: null,
          spaceTagIds: [],
          scentNotes: { top: [], heart: [], base: [] },
          ingredients: "",
          safetyInfo: "",
          burnTime: "",
          dimensions: "",
          finish: "",
          madeToOrder: false,
          leadTimeDays: 0,
          images: [{ publicId: "img2", alt: "Another image here", width: 1200, height: 1200, position: 0 }],
          pairsWith: [],
          seo: { title: "", metaDescription: "", ogImage: "" },
          featured: false,
          sortOrder: 0,
          variants: [{ label: "Small", sku: "DUP-SKU", price: 5000, salePrice: null, lowStockThreshold: 5, costPrice: 2000, active: true }],
        },
        ownerId
      )
    ).rejects.toMatchObject({ code: "SKU_TAKEN" });
  });
});
