import { describe, it, expect, beforeEach, vi } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/order";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";
import { User } from "@/lib/db/models/user";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { getDashboardSnapshot } from "@/lib/services/admin/dashboard";

describe("admin dashboard", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await Order.deleteMany({});
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    await CustomRequest.deleteMany({});

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

  it("returns dashboard snapshot with required fields", async () => {
    const snapshot = await getDashboardSnapshot("today");
    expect(snapshot.period).toBe("today");
    expect(snapshot.headline).toBeDefined();
    expect(snapshot.actionList).toBeDefined();
    expect(Array.isArray(snapshot.topProducts)).toBe(true);
    expect(Array.isArray(snapshot.revenueByCategory)).toBe(true);
    expect(Array.isArray(snapshot.lowStock)).toBe(true);
    expect(snapshot.stockValue).toBeDefined();
  });
});
