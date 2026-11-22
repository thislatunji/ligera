import { signatureProducts, type Product } from "./products";

export const DELIVERY_FEE = 3500;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getAuthHeaders(): Promise<HeadersInit> {
  return {
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json.error) msg = json.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

// Compatibility helper to replace TanStack Start's useServerFn
export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

const LOCAL_PRODUCTS_KEY = "ligera-products-local-v1";

function toAdminProductDefault(p: Product, idx: number): AdminProduct {
  return {
    id: p.id,
    variantId: p.variantId,
    slug: p.slug,
    name: p.name,
    notes: p.notes,
    category: p.category,
    price: p.price,
    stock: p.stock,
    low_stock_threshold: 5,
    active: true,
    sort_order: idx,
    imageUrl: p.imageUrl ?? null,
  };
}

function readLocalAdminProducts(): AdminProduct[] {
  const seed = signatureProducts.map((p, idx) => toAdminProductDefault(p, idx));
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed;
    return parsed as AdminProduct[];
  } catch {
    return seed;
  }
}

function localProductsToPublic(): Product[] {
  return readLocalAdminProducts()
    .filter((p) => p.active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => ({
      id: p.id,
      variantId: p.variantId,
      slug: p.slug,
      name: p.name,
      notes: p.notes,
      category: p.category,
      price: p.price,
      stock: p.stock,
      imageUrl: p.imageUrl ?? null,
    }));
}

// Shop API
export async function listProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) {
      return localProductsToPublic();
    }
    const json = await res.json();
    const items = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    if (items.length === 0) {
      return localProductsToPublic();
    }
    return items.map((p: any) => ({
      id: p.id,
      variantId: p.variantId,
      slug: p.slug,
      name: p.name,
      notes: p.notes ?? "",
      category: p.category ?? "Candles",
      categorySlug: p.categorySlug,
      price: p.price ?? p.priceFrom ?? 0,
      stock: p.stock ?? (p.badge === "sold_out" ? 0 : 10),
      imageUrl: p.imageUrl || null,
    }));
  } catch {
    return localProductsToPublic();
  }
}

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  etaText?: string;
};

export async function listDeliveryZones(): Promise<DeliveryZone[]> {
  try {
    const res = await fetch(`${API_BASE}/api/delivery-zones`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

export type OrderInput = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zoneId?: string;
  deliveryMethod?: "delivery" | "pickup";
  note?: string;
  hidePrices?: boolean;
  items: { id: string; variantId?: string; qty: number }[];
};

export type PlaceOrderResult = {
  reference: string;
  total: number;
  paymentUrl?: string;
  holdExpiresAt?: string;
  expectedDeliveryWindow?: string;
};

export async function placeOrder({
  data,
}: {
  data: OrderInput;
}): Promise<PlaceOrderResult> {
  const deliveryMethod = data.deliveryMethod ?? (data.zoneId ? "delivery" : "pickup");
  const payload: Record<string, unknown> = {
    contact: {
      name: data.customerName,
      email: data.email,
      phone: data.phone,
    },
    deliveryMethod,
    giftNote: data.note ?? "",
    hidePrices: Boolean(data.hidePrices),
    items: data.items.map((i) => ({
      variantId: i.variantId ?? i.id,
      qty: i.qty,
    })),
  };

  if (deliveryMethod === "delivery") {
    payload.address = {
      address: data.address,
      city: data.city,
      state: data.state,
    };
    if (data.zoneId) {
      payload.zoneId = data.zoneId;
    }
  }

  const res = await fetch(`${API_BASE}/api/checkout/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await handleResponse<{
    orderNumber?: string;
    reference?: string;
    total: number;
    paymentUrl?: string;
    holdExpiresAt?: string;
    expectedDeliveryWindow?: string;
  }>(res);
  return {
    reference: result.orderNumber ?? result.reference ?? "",
    total: result.total,
    paymentUrl: result.paymentUrl,
    holdExpiresAt: result.holdExpiresAt,
    expectedDeliveryWindow: result.expectedDeliveryWindow,
  };
}

export interface CheckoutQuote {
  items: Array<{
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
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryGap?: number;
  expectedDeliveryWindow?: string;
}

export async function fetchCheckoutQuote(input: {
  items: { variantId: string; qty: number }[];
  zoneId?: string;
  deliveryMethod: "delivery" | "pickup";
}): Promise<CheckoutQuote> {
  const res = await fetch(`${API_BASE}/api/checkout/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<CheckoutQuote>(res);
}

export interface PublicOrderPaymentStatus {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryMethod: "delivery" | "pickup";
  deliveryZoneName: string;
  items: Array<{ name: string; qty: number; unitPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  expectedDeliveryWindow: string;
  placedAt: string;
  paidAt: string | null;
  paymentUrl: string | null;
}

async function fetchPublicOrderEndpoint(
  url: string,
  signal?: AbortSignal
): Promise<{ status: number; data: PublicOrderPaymentStatus | null }> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  let data: PublicOrderPaymentStatus | null = null;
  try {
    const json = await res.json();
    if (res.ok && json && typeof json.orderNumber === "string") {
      data = json as PublicOrderPaymentStatus;
    }
  } catch {
    // ignore non-JSON body
  }
  return { status: res.status, data };
}

export async function getOrderPaymentStatus(
  orderNumber: string,
  signal?: AbortSignal
): Promise<{ status: number; data: PublicOrderPaymentStatus | null }> {
  return fetchPublicOrderEndpoint(
    `${API_BASE}/api/checkout/orders/${encodeURIComponent(orderNumber)}/status`,
    signal
  );
}

export async function verifyOrderPaymentStatus(
  orderNumber: string,
  transactionId?: string | null,
  signal?: AbortSignal
): Promise<{ status: number; data: PublicOrderPaymentStatus | null }> {
  const qs = transactionId
    ? `?transaction_id=${encodeURIComponent(transactionId)}`
    : "";
  return fetchPublicOrderEndpoint(
    `${API_BASE}/api/checkout/orders/${encodeURIComponent(orderNumber)}/verify-status${qs}`,
    signal
  );
}

// Admin API
export async function adminMe(): Promise<{ isAdmin: boolean; userId?: string; role?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      return { isAdmin: false };
    }
    const json = await res.json();
    const user = json?.user;
    return {
      isAdmin: user?.role === "owner" || user?.role === "staff",
      userId: user?.id,
      role: user?.role,
    };
  } catch {
    return { isAdmin: false };
  }
}

export type AdminProduct = {
  id: string;
  variantId?: string;
  slug: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  active: boolean;
  sort_order: number;
  imageUrl: string | null;
};

export async function adminListProducts(): Promise<AdminProduct[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products`, {
    headers,
    credentials: "include",
  });
  const json = await handleResponse<{ data?: any[] } | any[]>(res);
  const items = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return items.map((p: any) => {
    const v = Array.isArray(p.variants) ? p.variants[0] : undefined;
    return {
      id: p.id,
      variantId: v?.id,
      slug: p.slug,
      name: p.name,
      notes: p.description ?? "",
      category: p.category?.name || "Candles",
      price: v?.price ?? 0,
      stock: v?.stockQty ?? 0,
      low_stock_threshold: v?.lowStockThreshold ?? 5,
      active: p.status === "published",
      sort_order: p.sortOrder ?? 0,
      imageUrl: p.imageThumb ?? p.images?.[0]?.publicId ?? null,
    };
  });
}

export type ProductDraft = {
  id?: string;
  variantId?: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  sortOrder: number;
  imageUrl?: string | null;
};

export async function saveProduct({ data }: { data: ProductDraft }): Promise<{ id: string }> {
  const headers = await getAuthHeaders();
  const safeAlt = data.name.trim().length >= 3 ? data.name.trim() : `${data.name.trim() || "Ligera"} product`;
  const normalizedImageUrl =
    data.imageUrl && data.imageUrl.trim() !== "" ? data.imageUrl.trim() : null;
  const imagesPayload = normalizedImageUrl
    ? [{ publicId: normalizedImageUrl, alt: safeAlt, width: 1200, height: 1200, position: 0 }]
    : [];

  if (data.id) {
    const updateBody: Record<string, unknown> = {
      name: data.name,
      description: data.notes,
      sortOrder: data.sortOrder,
      images: imagesPayload,
    };
    if (data.variantId) {
      updateBody.variants = [
        {
          id: data.variantId,
          label: "Standard",
          price: data.price,
          lowStockThreshold: data.lowStockThreshold,
          active: true,
        },
      ];
    }
    const res = await fetch(`${API_BASE}/api/admin/products/${data.id}`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(updateBody),
    });
    const updated = await handleResponse<{ id: string }>(res);
    await fetch(`${API_BASE}/api/admin/products/${data.id}/status`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ status: data.active ? "published" : "archived" }),
    });
    return updated;
  }

  const skuBase = data.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const sku = `${skuBase || "PROD"}-${Date.now().toString(36).toUpperCase()}`;

  const createBody = {
    name: data.name,
    description: data.notes,
    categoryId: null,
    sortOrder: data.sortOrder,
    images: imagesPayload,
    variants: [
      {
        label: "Standard",
        sku,
        price: data.price,
        lowStockThreshold: data.lowStockThreshold,
        active: true,
      },
    ],
  };

  const res = await fetch(`${API_BASE}/api/admin/products`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(createBody),
  });
  const created = await handleResponse<{ id: string }>(res);

  if (data.active) {
    await fetch(`${API_BASE}/api/admin/products/${created.id}/status`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify({ status: "published" }),
    });
  }

  if (data.stock > 0) {
    const products = await adminListProducts();
    const match = products.find((p) => p.id === created.id);
    if (match?.variantId) {
      await fetch(`${API_BASE}/api/admin/variants/${match.variantId}/stock`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          change: data.stock,
          reason: "restock",
          note: "Initial stock",
        }),
      });
    }
  }

  return created;
}

export async function deleteProduct({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products/${data.id}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function setStock({
  data,
}: {
  data: {
    id: string;
    variantId?: string;
    stock?: number;
    currentStock?: number;
    lowStockThreshold?: number;
  };
}): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const targetId = data.variantId ?? data.id;

  if (data.stock !== undefined && data.currentStock !== undefined && data.stock !== data.currentStock) {
    const change = data.stock - data.currentStock;
    const res = await fetch(`${API_BASE}/api/admin/variants/${targetId}/stock`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        change,
        reason: "correction",
        note: "Updated from admin",
      }),
    });
    await handleResponse(res);
  }

  if (data.lowStockThreshold !== undefined) {
    const res = await fetch(`${API_BASE}/api/admin/variants/${targetId}`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify({ lowStockThreshold: data.lowStockThreshold }),
    });
    await handleResponse(res);
  }

  return { ok: true };
}

export type AdminOrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  fulfilled_quantity: number;
};

export type AdminOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "abandoned";

export type AdminOrder = {
  id: string;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  delivery_note: string | null;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: AdminOrderStatus;
  created_at: string;
  item_count: number;
  order_items: AdminOrderItem[];
};

export async function adminListOrders(): Promise<AdminOrder[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return items.map((o: any) => ({
      id: o.id,
      reference: o.orderNumber ?? o.id,
      customer_name: o.customer?.name ?? "",
      email: o.customer?.email ?? "",
      phone: o.customer?.phone ?? "",
      address: o.deliveryAddress?.address ?? o.deliveryZoneName ?? o.deliveryMethod ?? "",
      city: o.deliveryAddress?.city ?? "",
      state: o.deliveryAddress?.state ?? "",
      delivery_note: o.giftNote ?? null,
      payment_method: "Flutterwave",
      subtotal: o.subtotal ?? o.total ?? 0,
      delivery_fee: o.deliveryFee ?? 0,
      total: o.total ?? 0,
      status: o.status,
      created_at: o.placedAt ?? new Date().toISOString(),
      item_count: o.itemCount ?? 0,
      order_items: Array.isArray(o.items)
        ? o.items.map((item: any, idx: number) => ({
            id: item.id ?? `${o.id}-${idx}`,
            product_name: item.name ?? "",
            unit_price: item.unitPrice ?? 0,
            quantity: item.qty ?? 0,
            fulfilled_quantity: item.fulfilledQuantity ?? 0,
          }))
        : [],
    }));
  } catch {
    return [];
  }
}

export async function updateOrderStatus({
  data,
}: {
  data: { id: string; status: AdminOrderStatus };
}): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/orders/${data.id}/status`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ status: data.status }),
  });
  await handleResponse(res);
  return { ok: true };
}

export async function setFulfilledQuantity({
  data: _data,
}: {
  data: { itemId: string; fulfilledQuantity: number };
}): Promise<{ ok: boolean }> {
  return { ok: true };
}
