export function calculateDeliveryFee({
  deliveryMethod,
  subtotal,
  zoneFee,
  freeDeliveryThreshold,
}: {
  deliveryMethod: "delivery" | "pickup";
  subtotal: number;
  zoneFee?: number;
  freeDeliveryThreshold?: number;
}) {
  if (deliveryMethod === "pickup") {
    return 0;
  }
  if (freeDeliveryThreshold && subtotal >= freeDeliveryThreshold) {
    return 0;
  }
  return zoneFee || 0;
}
