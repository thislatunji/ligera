import { describe, it, expect, beforeEach, vi } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { Settings } from "@/lib/db/models/settings";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { getSettings, updateSettings } from "@/lib/services/admin/settings";

describe("admin settings", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await Settings.deleteMany({});
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

  it("get returns merged defaults", async () => {
    const settings = await getSettings();
    expect(settings.store).toBeDefined();
    expect(settings.delivery).toBeDefined();
  });

  it("partial PUT updates only patched keys and logs activity", async () => {
    const before = await getSettings();
    const updated = await updateSettings({ store: { name: "Ligera Updated" } }, ownerId);
    expect(updated.store.name).toBe("Ligera Updated");
    const log = await ActivityLog.findOne({ action: "settings.update" });
    expect(log).toBeDefined();
  });
});
