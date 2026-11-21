import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";

describe("health", () => {
  beforeEach(async () => {
    await connectDb();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handler returns { status: \"ok\", db: \"up\" } with mocked ping", async () => {
    const ping = vi.fn().mockResolvedValue({ ok: 1 });
    vi.spyOn(mongoose.connection.db as any, "admin").mockReturnValue({ ping });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok", db: "up" });
  });

  it("returns { db: \"down\" } (not 500) when ping rejects", async () => {
    const ping = vi.fn().mockRejectedValue(new Error("fail"));
    vi.spyOn(mongoose.connection.db as any, "admin").mockReturnValue({ ping });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ db: "down" });
  });

  it("route test: GET(new NextRequest(\"/api/health\")) → 200 JSON", async () => {
    const ping = vi.fn().mockResolvedValue({ ok: 1 });
    vi.spyOn(mongoose.connection.db as any, "admin").mockReturnValue({ ping });
    const res = await GET(new NextRequest("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok", db: "up" });
  });
});
