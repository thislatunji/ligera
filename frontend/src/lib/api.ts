import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./products";

export const DELIVERY_FEE = 3500;

const API_BASE = import.meta.env.VITE_API_URL || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
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

// Shop API
export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  return handleResponse<Product[]>(res);
}

export type OrderInput = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note?: string;
  items: { id: string; qty: number }[];
};

export async function placeOrder({ data }: { data: OrderInput }): Promise<{ reference: string; total: number }> {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ reference: string; total: number }>(res);
}

// Admin API
export async function adminMe(): Promise<{ isAdmin: boolean; userId?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/me`, { headers });
  return handleResponse<{ isAdmin: boolean; userId?: string }>(res);
}

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  active: boolean;
  sort_order: number;
};

export async function adminListProducts(): Promise<AdminProduct[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products`, { headers });
  return handleResponse<AdminProduct[]>(res);
}

export type ProductDraft = {
  id?: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  sortOrder: number;
};

export async function saveProduct({ data }: { data: ProductDraft }): Promise<{ id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<{ id: string }>(res);
}

export async function deleteProduct({ data }: { data: { id: string } }): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products/${data.id}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function setStock({
  data,
}: {
  data: { id: string; stock: number; lowStockThreshold?: number };
}): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/products/${data.id}/stock`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export type AdminOrderItem = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  fulfilled_quantity: number;
};

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
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  created_at: string;
  order_items: AdminOrderItem[];
};

export async function adminListOrders(): Promise<AdminOrder[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/orders`, { headers });
  return handleResponse<AdminOrder[]>(res);
}

export async function updateOrderStatus({
  data,
}: {
  data: { id: string; status: "pending" | "confirmed" | "fulfilled" | "cancelled" };
}): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/orders/${data.id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: data.status }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function setFulfilledQuantity({
  data,
}: {
  data: { itemId: string; fulfilledQuantity: number };
}): Promise<{ ok: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/orders/items/${data.itemId}/fulfillment`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fulfilledQuantity: data.fulfilledQuantity }),
  });
  return handleResponse<{ ok: boolean }>(res);
}
