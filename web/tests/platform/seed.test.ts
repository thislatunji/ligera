import { describe, it, expect, beforeEach } from "vitest";
import { seedOwner } from "../../scripts/seed-owner";
import { seedSettings } from "../../scripts/seed-settings";
import { User } from "@/lib/db/models/user";
import { Settings } from "@/lib/db/models/settings";
import { connectDb } from "@/lib/db/connect";

describe("seed scripts", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await Settings.deleteMany({});
  });

  it("seeds owner and settings", async () => {
    const owner = await seedOwner();
    expect(owner.role).toBe("owner");
    const settings = await seedSettings();
    expect(settings).toBeDefined();
  });
});
