import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { listActivityLogs } from "@/lib/services/admin/activity";

describe("admin activity logs", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
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

  it("lists activity logs", async () => {
    const mongoose = await import("mongoose");
    await ActivityLog.create({ userId: new mongoose.Types.ObjectId(ownerId), action: "product.create", entity: { type: "product", id: "123" } });
    const res = await listActivityLogs({ action: "product." });
    expect(res.data.length).toBeGreaterThan(0);
  });
});
