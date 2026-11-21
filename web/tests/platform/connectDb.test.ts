import { describe, it, expect } from "vitest";
import { connectDb } from "@/lib/db/connect";
import mongoose from "mongoose";

describe("connectDb", () => {
  it("connects to memory server and pings", async () => {
    await connectDb();
    expect(mongoose.connection.readyState).toBe(1); // connected
    await mongoose.connection.db.admin().ping();
  });
});
