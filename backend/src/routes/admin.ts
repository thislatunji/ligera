import { Router, type Response } from "express";
import { z } from "zod";
import { requireAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

export const ORDER_STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(600).default(""),
  category: z.string().trim().min(1).max(60),
  price: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

// Apply admin authentication to all routes below
router.use(requireAdmin);

// GET /api/admin/me
router.get("/me", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ isAdmin: true, userId: req.user?.id });
});

// GET /api/admin/products
router.get("/products", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = req.supabaseUserClient || supabaseAdmin;
    const { data, error } = await client
      .from("products")
      .select("id, slug, name, notes, category, price, stock, low_stock_threshold, active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list admin products" });
  }
});

// POST /api/admin/products (Create or Update)
router.post("/products", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = productInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const client = req.supabaseUserClient || supabaseAdmin;
    const row = {
      name: data.name,
      notes: data.notes,
      category: data.category,
      price: data.price,
      stock: data.stock,
      low_stock_threshold: data.lowStockThreshold,
      active: data.active,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { error } = await client.from("products").update(row).eq("id", data.id);
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ id: data.id });
      return;
    }

    const slug = `${slugify(data.name) || "product"}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: created, error } = await client
      .from("products")
      .insert({ ...row, slug })
      .select("id")
      .single();

    if (error || !created) {
      res.status(500).json({ error: error?.message ?? "Could not create product" });
      return;
    }
    res.status(201).json({ id: created.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save product" });
  }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: "Missing product id" });
      return;
    }
    const client = req.supabaseUserClient || supabaseAdmin;
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

// POST /api/admin/products/:id/stock
router.post("/products/:id/stock", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      stock: z.number().int().min(0).max(100_000),
      lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    const id = req.params.id as string;
    const patch: { stock: number; low_stock_threshold?: number } = { stock: parsed.data.stock };
    if (parsed.data.lowStockThreshold !== undefined) {
      patch.low_stock_threshold = parsed.data.lowStockThreshold;
    }

    const client = req.supabaseUserClient || supabaseAdmin;
    const { error } = await client.from("products").update(patch).eq("id", id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to set stock" });
  }
});

// GET /api/admin/orders
router.get("/orders", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = req.supabaseUserClient || supabaseAdmin;
    const { data, error } = await client
      .from("orders")
      .select(
        "id, reference, customer_name, email, phone, address, city, state, delivery_note, payment_method, subtotal, delivery_fee, total, status, created_at, order_items(id, product_name, unit_price, quantity, fulfilled_quantity)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list admin orders" });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch("/orders/:id/status", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      status: z.enum(ORDER_STATUSES),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid status value", details: parsed.error.issues });
      return;
    }

    const id = req.params.id as string;
    const client = req.supabaseUserClient || supabaseAdmin;
    const { error } = await client.from("orders").update({ status: parsed.data.status }).eq("id", id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update order status" });
  }
});

// PATCH /api/admin/orders/items/:itemId/fulfillment
router.patch("/orders/items/:itemId/fulfillment", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      fulfilledQuantity: z.number().int().min(0).max(9999),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid fulfilledQuantity", details: parsed.error.issues });
      return;
    }

    const itemId = req.params.itemId as string;
    const client = req.supabaseUserClient || supabaseAdmin;
    const { error } = await client
      .from("order_items")
      .update({ fulfilled_quantity: parsed.data.fulfilledQuantity })
      .eq("id", itemId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update fulfilled quantity" });
  }
});

export default router;
