export interface QuoteSummary {
  items: {
    variantId: string;
    productId: string;
    slug?: string;
    name: string;
    label?: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    available: number;
    soldOut: boolean;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryGap?: number;
  expectedDeliveryWindow?: string;
}

export interface CheckoutResult {
  orderNumber: string;
  total: number;
  paymentUrl: string;
  holdExpiresAt: string;
  expectedDeliveryWindow: string;
}

export interface OrderStatusView {
  orderNumber: string;
  status:
    | "pending_payment"
    | "paid"
    | "processing"
    | "ready_for_pickup"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "abandoned";
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  items: { name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  expectedDeliveryWindow: string;
  placedAt: string;
  giftNote?: string;
}

export interface VerifiedPayment {
  orderId: string;
  orderNumber: string;
  flwTransactionId: number;
  txRef: string;
  amount: number;
  currency: string;
  status: "successful" | "failed" | "abandoned";
  rawSummary: Record<string, unknown>;
  processedAt: Date;
}
