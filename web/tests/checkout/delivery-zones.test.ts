import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/delivery-zones/route";
import { connectDb } from "@/lib/db/connect";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";

describe("GET /api/delivery-zones", () => {
  beforeEach(async () => {
    await connectDb();
    await DeliveryZone.deleteMany({});
    await DeliveryZone.create({ name: "Lekki", fee: 3000, etaText: "2–3 working days", active: true, sortOrder: 2 });
    await DeliveryZone.create({ name: "Ikeja", fee: 2000, etaText: "2–3 working days", active: true, sortOrder: 1 });
  });

  it("returns active zones sorted", async () => {
    const res = await GET();
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].name).toBe("Ikeja");
  });
});
