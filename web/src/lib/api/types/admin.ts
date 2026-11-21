export interface DashboardSnapshot {
  period: "today" | "7d" | "30d";
  headline: {
    revenue: number;
    previousRevenue: number;
    paidOrders: number;
    previousPaidOrders: number;
    averageOrderValue: number;
    previousAverageOrderValue: number;
  };
  actionList: {
    ordersAwaitingProcessing: number;
    customRequestsNew: number;
    failedOrAbandonedPayments: number;
  };
  topProducts: {
    productId: string;
    name: string;
    slug: string;
    unitsSold: number;
    revenue: number;
  }[];
  revenueByCategory: {
    categoryId: string;
    name: string;
    revenue: number;
  }[];
  lowStock: {
    variantId: string;
    productName: string;
    label: string;
    sku: string;
    available: number;
    threshold: number;
    soldOut: boolean;
  }[];
  stockValue: { atCost: number; atSelling: number };
}

export interface Settings {
  store: any;
  delivery: any;
  payment: any;
  homepage: any;
  seo: any;
  emailTemplates: any;
}

export interface ContentPage {
  slug: string;
  title: string;
  sections: { heading: string; body: string; image?: { url: string; alt: string } | null }[];
  seo: { title: string; metaDescription: string };
  updatedAt: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt?: string;
  marketingConsent: boolean;
  createdAt: string;
}

export interface ActivityLogRow {
  id: string;
  at: string;
  userName: string;
  action: string;
  entity: { type: string; id: string };
  before?: unknown;
  after?: unknown;
}
