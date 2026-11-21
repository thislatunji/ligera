import { describe, it, expect } from "vitest";
import { calculateDeliveryFee } from "@/lib/services/checkout/fees";

describe("fees", () => {
  it("pickup -> 0", () => {
    expect(calculateDeliveryFee({ deliveryMethod: "pickup", subtotal: 10000 })).toBe(0);
  });
  it("subtotal >= threshold -> 0", () => {
    expect(calculateDeliveryFee({ deliveryMethod: "delivery", subtotal: 200000, zoneFee: 3000, freeDeliveryThreshold: 150000 })).toBe(0);
  });
  it("zone fee otherwise", () => {
    expect(calculateDeliveryFee({ deliveryMethod: "delivery", subtotal: 100000, zoneFee: 3000, freeDeliveryThreshold: 150000 })).toBe(3000);
  });
});
