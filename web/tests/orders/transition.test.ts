import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/order";
import { User } from "@/lib/db/models/user";
import { transitionOrder, ALLOWED_TRANSITIONS, TRANSITION_MATRIX } from "@/lib/services/orders/transition";
import mongoose from "mongoose";

describe("orders transition", () => {
  beforeEach(async () => {
    await connectDb();
    await Order.deleteMany({});
    await User.deleteMany({});
  });

  it("exports transition matrix", () => {
    expect(ALLOWED_TRANSITIONS).toBeDefined();
    expect(TRANSITION_MATRIX).toBeDefined();
    expect(ALLOWED_TRANSITIONS.delivered).toEqual([]);
  });
});
