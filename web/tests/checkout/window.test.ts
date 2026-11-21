import { describe, it, expect } from "vitest";
import { computeExpectedDeliveryWindow } from "@/lib/services/checkout/window";

describe("window", () => {
  it("computes window", () => {
    const result = computeExpectedDeliveryWindow({ zoneEtaText: "2–3 working days", now: new Date("2026-11-11T10:00:00Z") });
    expect(result).toBeTruthy();
  });
});
