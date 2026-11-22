import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword, comparePassword } from "@/lib/auth/bcrypt";
import { signAccessToken } from "@/lib/auth/jwt";
import {
  createProduct,
  getAdminProductById,
  listAdminProducts,
  updateProduct,
  updateProductStatus,
} from "@/lib/services/catalog/admin";
import { GET as getProductRoute } from "@/app/api/admin/products/[id]/route";
import { POST as changePasswordPOST } from "@/app/api/auth/password/change/route";

describe("Admin product detail, category hydration, published edits & password change", () => {
  let ownerId: string;
  let ownerToken: string;

  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    await ActivityLog.deleteMany({});

    const passwordHash = await hashPassword("initialPass123");
    const owner = await User.create({
      name: "Studio Owner",
      email: "owner@ligerascents.com",
      passwordHash,
      role: "owner",
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
    });
    ownerId = owner._id.toString();
    ownerToken = await signAccessToken({ sub: ownerId, role: "owner" });
  });

  it("hydrates category name in listAdminProducts and returns full details in getAdminProductById", async () => {
    const cat = await Category.create({
      name: "Scented Candles",
      slug: "scented-candles",
      type: "category",
      active: true,
      sortOrder: 1,
    });

    const created = await createProduct(
      {
        name: "Amber Hush",
        description: "Warm amber & cedar",
        categoryId: cat._id.toString(),
        spaceTagIds: [],
        scentNotes: { top: ["Bergamot"], heart: ["Amber"], base: ["Cedar"] },
        ingredients: "Soy wax",
        safetyInfo: "Trim wick",
        burnTime: "40 hours",
        dimensions: "8x9cm",
        finish: "Amber glass",
        madeToOrder: false,
        leadTimeDays: 0,
        images: [{ publicId: "https://example.com/amber.jpg", alt: "Amber Hush candle", width: 1200, height: 1200, position: 0 }],
        pairsWith: [],
        seo: { title: "Amber Hush", metaDescription: "Luxury candle", ogImage: "" },
        featured: true,
        sortOrder: 1,
        variants: [
          { label: "180g", sku: "AMB-180", price: 18500, salePrice: null, lowStockThreshold: 5, costPrice: 9000, active: true },
        ],
      },
      ownerId,
    );

    const list = await listAdminProducts({ page: 1, limit: 20 }, "owner");
    expect(list.data).toHaveLength(1);
    expect(list.data[0].category?.name).toBe("Scented Candles");

    const detail = await getAdminProductById(created.id, "owner");
    expect(detail).toBeTruthy();
    expect(detail?.category?.name).toBe("Scented Candles");
    expect(detail?.scentNotes.top).toEqual(["Bergamot"]);
    expect(detail?.variants[0].costPrice).toBe(9000);

    // Route handler works with Promise-wrapped params (Next 15 style)
    const req = new NextRequest(`http://localhost/api/admin/products/${created.id}`, {
      headers: { cookie: `ligera_at=${ownerToken}` },
    });
    const res = await getProductRoute(req, { params: Promise.resolve({ id: created.id }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Amber Hush");
  });

  it("allows updating price/description of a published product even when slug has a numeric suffix", async () => {
    const first = await createProduct(
      {
        name: "Saffron Reed",
        description: "First",
        categoryId: null,
        spaceTagIds: [],
        scentNotes: { top: [], heart: [], base: [] },
        images: [],
        variants: [{ label: "Standard", sku: "SAF-1", price: 24000, salePrice: null, lowStockThreshold: 5, costPrice: 10000, active: true }],
      },
      ownerId,
    );
    const second = await createProduct(
      {
        name: "Saffron Reed",
        description: "Second",
        categoryId: null,
        spaceTagIds: [],
        scentNotes: { top: [], heart: [], base: [] },
        images: [],
        variants: [{ label: "Standard", sku: "SAF-2", price: 25000, salePrice: null, lowStockThreshold: 5, costPrice: 11000, active: true }],
      },
      ownerId,
    );

    await updateProductStatus(second.id, "published", ownerId);
    const secondDetail = await getAdminProductById(second.id, "owner");
    expect(secondDetail?.slug).toBe("saffron-reed-2");

    // Updating description & price while keeping the same name must NOT throw SLUG_IMMUTABLE
    const updated = await updateProduct(
      second.id,
      {
        name: "Saffron Reed",
        description: "Updated editorial note",
        variants: [
          {
            id: secondDetail!.variants[0].id,
            label: "Standard",
            sku: "SAF-2",
            price: 26500,
            salePrice: null,
            lowStockThreshold: 5,
            costPrice: 11000,
            active: true,
          },
        ],
      },
      ownerId,
    );
    expect(updated.id).toBe(second.id);
    expect(first.id).not.toBe(second.id);
  });

  it("changes password via POST /api/auth/password/change and logs audit entry", async () => {
    const wrongReq = new NextRequest("http://localhost/api/auth/password/change", {
      method: "POST",
      headers: { cookie: `ligera_at=${ownerToken}` },
      body: JSON.stringify({ currentPassword: "wrongPassword", newPassword: "newSecurePass123" }),
    });
    const wrongRes = await changePasswordPOST(wrongReq);
    expect(wrongRes.status).toBe(401);

    const okReq = new NextRequest("http://localhost/api/auth/password/change", {
      method: "POST",
      headers: { cookie: `ligera_at=${ownerToken}` },
      body: JSON.stringify({ currentPassword: "initialPass123", newPassword: "newSecurePass123" }),
    });
    const okRes = await changePasswordPOST(okReq);
    expect(okRes.status).toBe(200);

    const updatedUser = await User.findById(ownerId);
    expect(await comparePassword("newSecurePass123", updatedUser!.passwordHash)).toBe(true);
    const log = await ActivityLog.findOne({ action: "auth.password.change" });
    expect(log).toBeTruthy();
  });
});
