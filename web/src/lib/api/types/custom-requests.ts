export interface CustomRequestRow {
  id: string;
  requestNumber: string;
  contact: { name: string; email: string; phone: string };
  spaceOrSetting: string;
  productTypes: string[];
  quantity: number;
  budgetRange: string;
  eventDate?: string;
  status: "new" | "quoted" | "accepted" | "declined" | "completed";
  quoteAmount?: number;
  hasImage: boolean;
  createdAt: string;
}

export interface CustomRequestDetail extends CustomRequestRow {
  scentPreferences: string;
  referenceImage?: { url: string; alt: string };
  paymentLink?: {
    linkUrl: string;
    txRef: string;
    amount: number;
    status: "pending" | "successful" | "failed";
  };
  orderId?: string;
  orderNumber?: string;
  quotedAt?: string;
  notes: { userName: string; note: string; at: string }[];
  expectedResponseTime: "48 hours";
}

export interface QuoteResult {
  requestNumber: string;
  quoteAmount: number;
  paymentLinkUrl: string;
  deliveryIncluded: boolean;
}
