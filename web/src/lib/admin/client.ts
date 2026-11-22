import type {
  ActivityLogRow,
  ContentPage,
  CustomerRow,
  DashboardSnapshot,
  Settings,
} from "@/lib/api/types/admin";

export class AdminApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers = new Headers(init.headers);
  if (!isFormData && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (
    res.status === 401 &&
    retryOn401 &&
    !path.startsWith("/api/auth/login") &&
    !path.startsWith("/api/auth/refresh")
  ) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return adminFetch<T>(path, init, false);
    }
  }

  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && (json.error || json.message)) ||
      `Request failed (${res.status})`;
    const code = json && typeof json === "object" ? json.code : undefined;
    const details = json && typeof json === "object" ? json.details : undefined;
    throw new AdminApiError(msg, res.status, code, details);
  }

  return json as T;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  twoFactorEnabled?: boolean;
};

export type AdminProductVariant = {
  id: string;
  label: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stockQty: number;
  heldQty: number;
  available: number;
  lowStockThreshold: number;
  costPrice?: number;
  active: boolean;
};

export type AdminProductImage = {
  publicId: string;
  url?: string;
  alt: string;
  width: number;
  height: number;
  position: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: "draft" | "published" | "archived";
  categoryId?: string | null;
  category?: { id: string; name: string; slug?: string };
  featured?: boolean;
  madeToOrder?: boolean;
  sortOrder?: number;
  images?: AdminProductImage[];
  variants: AdminProductVariant[];
  lowStock: boolean;
  imageThumb?: string;
  updatedAt: string;
};

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "published" | "archived";
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  spaceTagIds: string[];
  scentNotes: { top: string[]; heart: string[]; base: string[] };
  ingredients: string;
  safetyInfo: string;
  burnTime: string;
  dimensions: string;
  finish: string;
  madeToOrder: boolean;
  leadTimeDays: number;
  images: AdminProductImage[];
  pairsWith: string[];
  seo: { title?: string; metaDescription?: string; ogImage?: string };
  featured: boolean;
  sortOrder: number;
  variants: AdminProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type AdminProductPayload = {
  name: string;
  description: string;
  categoryId: string | null;
  spaceTagIds: string[];
  scentNotes: { top: string[]; heart: string[]; base: string[] };
  ingredients: string;
  safetyInfo: string;
  burnTime: string;
  dimensions: string;
  finish: string;
  madeToOrder: boolean;
  leadTimeDays: number;
  images: { publicId: string; alt: string; width: number; height: number; position: number }[];
  pairsWith: string[];
  seo: { title: string; metaDescription: string; ogImage: string };
  featured: boolean;
  sortOrder: number;
  variants: {
    id?: string;
    label: string;
    sku: string;
    price: number;
    salePrice: number | null;
    lowStockThreshold: number;
    costPrice: number;
    active: boolean;
  }[];
  removedVariantIds?: string[];
};

export type AdminCategory = {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  type: "category" | "space" | "collection";
  parentId?: string | null;
  description: string;
  image?: { publicId: string; alt: string } | null;
  active: boolean;
  sortOrder: number;
  productCount?: number;
};

export type AdminOrderSummary = {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string };
  status: string;
  paymentStatus: string;
  deliveryZoneName?: string;
  deliveryMethod: string;
  itemCount: number;
  total: number;
  placedAt: string;
  updatedAt: string;
  giftOrder: boolean;
  needsAction: boolean;
};

export type AdminOrderDetail = AdminOrderSummary & {
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
  deliveryAddress?: {
    address?: string;
    city?: string;
    state?: string;
    landmark?: string;
  };
  giftNote?: string;
  hidePrices: boolean;
  payment: {
    reference?: string;
    transactionId?: string;
    amount?: number;
    status?: string;
  };
  statusTimeline: {
    status: string;
    at: string;
    byUserName?: string;
    note?: string;
  }[];
  internalNotes: string[];
  restoreStockOnCancel: boolean;
  source: string;
  expectedDeliveryWindow: string;
};

export type AdminCustomRequestSummary = {
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
};

export type AdminCustomRequestDetail = AdminCustomRequestSummary & {
  scentPreferences: string;
  referenceImage?: { url: string; alt: string };
  paymentLink?: { linkUrl: string; txRef: string; amount: number; status: string };
  orderId?: string;
  orderNumber?: string;
  quotedAt?: string;
  notes: { userName: string; note: string; at: string }[];
  expectedResponseTime: string;
};

export type AdminDeliveryZone = {
  _id: string;
  name: string;
  fee: number;
  etaText?: string;
  active: boolean;
  sortOrder: number;
};

export type AdminNotificationRow = {
  id: string;
  type: string;
  recipient: string;
  status: string;
  retryCount: number;
  sentAt?: string;
  lastError?: string;
  orderNumber?: string;
  createdAt: string;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
};

export async function uploadAdminMedia(file: File): Promise<{
  publicId: string;
  url: string;
  width: number;
  height: number;
  viaCloudinary: boolean;
}> {
  const sign = await adminFetch<{
    signature: string;
    timestamp: number;
    folder: string;
    apiKey: string;
    cloudName: string;
  }>("/api/admin/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ folder: "ligera" }),
  });

  const hasCloudinary =
    Boolean(sign.cloudName) &&
    sign.cloudName !== "test-cloud" &&
    sign.cloudName !== "your-cloud-name" &&
    Boolean(sign.apiKey) &&
    sign.apiKey !== "test-key" &&
    sign.apiKey !== "your-api-key";

  if (hasCloudinary) {
    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sign.apiKey);
    form.append("timestamp", String(sign.timestamp));
    form.append("folder", sign.folder);
    form.append("signature", sign.signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/${resourceType}/upload`,
      { method: "POST", body: form },
    );
    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Media upload failed.");
    }
    const uploaded = await uploadRes.json();
    return {
      publicId: uploaded.secure_url,
      url: uploaded.secure_url,
      width: uploaded.width || 1200,
      height: uploaded.height || 1200,
      viaCloudinary: true,
    };
  }

  // Fallback for local / pre-Cloudinary environments: compress images cleanly via canvas
  if (file.type.startsWith("image/") && typeof document !== "undefined") {
    const compressed = await compressImageToDataUrl(file, 1200, 0.84);
    return {
      publicId: compressed.dataUrl,
      url: compressed.dataUrl,
      width: compressed.width,
      height: compressed.height,
      viaCloudinary: false,
    };
  }

  const rawDataUrl = await readAsDataUrl(file);
  return {
    publicId: rawDataUrl,
    url: rawDataUrl,
    width: 1200,
    height: 1200,
    viaCloudinary: false,
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function compressImageToDataUrl(
  file: File,
  maxDim: number,
  quality: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          readAsDataUrl(file)
            .then((dataUrl) => resolve({ dataUrl, width: 1200, height: 1200 }))
            .catch(reject);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, quality);
        URL.revokeObjectURL(url);
        resolve({ dataUrl, width, height });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readAsDataUrl(file)
        .then((dataUrl) => resolve({ dataUrl, width: 1200, height: 1200 }))
        .catch(reject);
    };
    img.src = url;
  });
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export const adminApi = {
  me: () => adminFetch<{ user: AdminUser }>("/api/auth/me", {}, true),
  login: (body: { email: string; password: string; totpCode?: string }) =>
    adminFetch<{ user: AdminUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => adminFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  requestPasswordReset: (email: string) =>
    adminFetch<{ ok: boolean }>("/api/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token: string, password: string) =>
    adminFetch<{ ok: boolean }>("/api/auth/password/confirm-reset", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    adminFetch<{ ok: boolean }>("/api/auth/password/change", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  setup2fa: () => adminFetch<{ secret: string; otpauthUri: string }>("/api/auth/2fa/setup", { method: "POST" }),
  enable2fa: (code: string) =>
    adminFetch<{ ok: boolean }>("/api/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  dashboard: (period: "today" | "7d" | "30d" = "today") =>
    adminFetch<DashboardSnapshot>(`/api/admin/dashboard${qs({ period })}`),

  listProducts: (params: {
    q?: string;
    status?: string;
    lowStock?: boolean;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) => adminFetch<PaginatedResult<AdminProductRow>>(`/api/admin/products${qs(params)}`),
  getProduct: (id: string) => adminFetch<AdminProductDetail>(`/api/admin/products/${id}`),
  createProduct: (payload: AdminProductPayload) =>
    adminFetch<{ id: string }>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: Partial<AdminProductPayload>) =>
    adminFetch<{ id: string }>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateProductStatus: (id: string, status: "draft" | "published" | "archived") =>
    adminFetch<{ id: string; status: string }>(`/api/admin/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  duplicateProduct: (id: string) =>
    adminFetch<{ id: string }>(`/api/admin/products/${id}/duplicate`, {
      method: "POST",
    }),
  deleteProduct: (id: string) =>
    adminFetch<{ ok: boolean }>(`/api/admin/products/${id}`, {
      method: "DELETE",
    }),
  adjustStock: (
    variantId: string,
    payload: { change: number; reason: "restock" | "damaged" | "sample" | "correction"; note?: string },
  ) =>
    adminFetch<any>(`/api/admin/variants/${variantId}/stock`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importProductsCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return adminFetch<{ created: number; updated: number; failed: number; failures: { row: number; error: string }[] }>(
      "/api/admin/products/import.csv",
      { method: "POST", body: form },
    );
  },

  listCategories: async (): Promise<AdminCategory[]> => {
    const raw = await adminFetch<any[]>("/api/admin/categories");
    return (Array.isArray(raw) ? raw : []).map((c) => ({
      ...c,
      id: c.id || c._id?.toString(),
    }));
  },
  createCategory: (payload: {
    name: string;
    type: "category" | "space" | "collection";
    parentId?: string | null;
    description?: string;
    image?: { publicId: string; alt: string } | null;
    active?: boolean;
    sortOrder?: number;
  }) =>
    adminFetch<any>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (
    id: string,
    payload: Partial<{
      name: string;
      type: "category" | "space" | "collection";
      description: string;
      image: { publicId: string; alt: string } | null;
      active: boolean;
      sortOrder: number;
    }>,
  ) =>
    adminFetch<any>(`/api/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: string) =>
    adminFetch<{ ok: boolean }>(`/api/admin/categories/${id}`, {
      method: "DELETE",
    }),

  listOrders: (params: {
    status?: string;
    paymentStatus?: string;
    view?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) => adminFetch<PaginatedResult<AdminOrderSummary>>(`/api/admin/orders${qs(params)}`),
  getOrder: (id: string) => adminFetch<AdminOrderDetail>(`/api/admin/orders/${id}`),
  transitionOrder: (
    id: string,
    payload: { status: string; note?: string; emailCustomer?: boolean },
  ) =>
    adminFetch<{ id: string; status: string; statusTimeline: any[] }>(
      `/api/admin/orders/${id}/status`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
  cancelOrder: (id: string, payload: { reason: string; restoreStock: boolean }) =>
    adminFetch<any>(`/api/admin/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  refundOrder: (id: string, payload: { amount?: number; reason?: string }) =>
    adminFetch<any>(`/api/admin/orders/${id}/refund`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyOrderPayment: (id: string) =>
    adminFetch<any>(`/api/admin/orders/${id}/verify-payment`),

  listCustomRequests: (params: { status?: string; q?: string }) =>
    adminFetch<AdminCustomRequestSummary[]>(`/api/admin/custom-requests${qs(params)}`),
  getCustomRequest: (id: string) =>
    adminFetch<AdminCustomRequestDetail>(`/api/admin/custom-requests/${id}`),
  quoteCustomRequest: (
    id: string,
    payload: { amount: number; note?: string; deliveryIncluded: boolean },
  ) =>
    adminFetch<any>(`/api/admin/custom-requests/${id}/quote`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCustomRequestStatus: (id: string, payload: { status: string; note?: string }) =>
    adminFetch<any>(`/api/admin/custom-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listCustomers: (params: { q?: string; consentOnly?: boolean; page?: number; limit?: number }) =>
    adminFetch<PaginatedResult<CustomerRow>>(`/api/admin/customers${qs(params)}`),

  listZones: () => adminFetch<AdminDeliveryZone[]>("/api/admin/delivery-zones"),
  createZone: (payload: {
    name: string;
    fee: number;
    etaText?: string;
    active: boolean;
    sortOrder?: number;
  }) =>
    adminFetch<{ id: string }>("/api/admin/delivery-zones", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateZone: (
    id: string,
    payload: {
      name: string;
      fee: number;
      etaText?: string;
      active: boolean;
      sortOrder?: number;
    },
  ) =>
    adminFetch<{ id: string }>(`/api/admin/delivery-zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteZone: (id: string) =>
    adminFetch<{ ok: boolean }>(`/api/admin/delivery-zones/${id}`, {
      method: "DELETE",
    }),

  getSettings: () => adminFetch<Settings>("/api/admin/settings"),
  updateSettings: (patch: Record<string, unknown>) =>
    adminFetch<Settings>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  listContentPages: () => adminFetch<ContentPage[]>("/api/admin/content"),
  getContentPage: (slug: string) => adminFetch<ContentPage>(`/api/admin/content/${slug}`),
  updateContentPage: (
    slug: string,
    payload: {
      title: string;
      sections: { heading: string; body: string; image?: { publicId: string; alt: string } | null }[];
      seo: { title: string; metaDescription: string };
    },
  ) =>
    adminFetch<ContentPage>(`/api/admin/content/${slug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  listNotifications: (params: {
    status?: string;
    type?: string;
    orderId?: string;
    page?: number;
    limit?: number;
  }) => adminFetch<PaginatedResult<AdminNotificationRow>>(`/api/admin/notifications${qs(params)}`),
  previewNotificationHtml: async (id: string): Promise<string> => {
    const res = await fetch(`/api/admin/notifications/${id}/preview`, {
      credentials: "include",
    });
    if (!res.ok) throw new AdminApiError("Could not load preview.", res.status);
    return res.text();
  },
  resendNotification: (id: string) =>
    adminFetch<{ id: string; status: string }>(`/api/admin/notifications/${id}/resend`, {
      method: "POST",
    }),

  listActivityLogs: (params: {
    action?: string;
    entity?: string;
    page?: number;
    limit?: number;
  }) => adminFetch<PaginatedResult<ActivityLogRow>>(`/api/admin/activity-logs${qs(params)}`),
};
