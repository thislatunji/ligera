export interface ActorContext {
  userId: string;
  role: "owner" | "staff";
}

export interface AdminOrderListRow {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string };
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
  deliveryZoneName?: string;
  deliveryMethod: "delivery" | "pickup";
  itemCount: number;
  total: number;
  placedAt: string;
  updatedAt: string;
  giftOrder: boolean;
  needsAction: boolean;
}

export interface AdminOrderDetail extends AdminOrderListRow {
  items: {
    name: string;
    sku: string;
    label: string;
    unitPrice: number;
    qty: number;
    imageUrl: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryAddress?: { address: string; city: string; state: string };
  giftNote?: string;
  hidePrices: boolean;
  payment: {
    reference: string;
    linkUrl?: string;
    amount: number;
    status: "pending" | "successful" | "failed" | "refunded";
    verifiedAt?: string;
  };
  statusTimeline: { status: string; at: string; byUserName?: string; note?: string }[];
  internalNotes: { id: string; userId: string; userName: string; note: string; at: string }[];
  restoreStockOnCancel: boolean;
  source: "storefront" | "custom_request";
  expectedDeliveryWindow: string;
}

export interface VerifyPaymentResult {
  checked: true;
  outcome: "already_paid" | "paid_now" | "successful_pending_apply" | "not_found" | "failed" | "amount_mismatch";
  orderStatus: string;
  message: string;
}
