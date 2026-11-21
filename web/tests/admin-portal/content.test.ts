import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ContentPage } from "@/lib/db/models/contentPage";
import { getContentPage, updateContentPage } from "@/lib/services/admin/content";

describe("admin content pages", () => {
  let ownerId: string;

  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ContentPage.deleteMany({});
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

  it("public read returns 404 for unknown slug", async () => {
    try {
      await getContentPage("unknown", false);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.code).toBe("NOT_FOUND");
    }
  });
});
