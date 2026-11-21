import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Order } from "@/lib/db/models/order";
import { createZone, deleteZone } from "@/lib/services/admin/zones";

describe("admin delivery zones", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await DeliveryZone.deleteMany({});
    await Order.deleteMany({});
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

  it("creates and deletes zone", async () => {
    const res = await createZone({ name: "Ikeja", fee: 1500, etaText: "Same day", active: true, sortOrder: 0 }, ownerId);
    expect(res.id).toBeDefined();
    const del = await deleteZone(res.id, ownerId);
    expect(del.ok).toBe(true);
  });

  it("deleting zone in use returns 409", async () => {
    const res = await createZone({ name: "Lekki", fee: 2000, active: true }, ownerId);
    await Order.create({ status: "paid", deliveryZoneId: res.id, total: 10000 });
    try {
      await deleteZone(res.id, ownerId);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.code).toBe("ZONE_IN_USE");
    }
  });
});
