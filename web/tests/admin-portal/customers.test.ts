import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { Customer } from "@/lib/db/models/customer";
import { Order } from "@/lib/db/models/order";
import { listCustomers, exportCustomersCSV } from "@/lib/services/admin/customers";

describe("admin customers", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await Customer.deleteMany({});
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

  it("lists customers and exports csv", async () => {
    await Customer.create({ email: "test@example.com", name: "Test", phone: "123", marketingConsent: true });
    const res = await listCustomers({ consentOnly: true });
    expect(res.data).toBeDefined();
    const csv = await exportCustomersCSV(ownerId);
    expect(csv).toContain("email");
  });
});
