import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

export const DELIVERY_FEE = 3500;

const orderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(4).max(300),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  note: z.string().trim().max(500).optional().default(""),
  items: z
    .array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});

// POST /api/orders - place an order
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order data", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const ids = data.items.map((i) => i.id);

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, active")
      .in("id", ids);

    if (productError) {
      res.status(500).json({ error: productError.message });
      return;
    }

    const lines = data.items.flatMap((item) => {
      const product = products?.find((p) => p.id === item.id);
      if (!product || !product.active) return [];
      return [{ product, qty: Math.min(item.qty, Math.max(product.stock, 0)) }];
    });

    const priced = lines.filter((l) => l.qty > 0);
    if (priced.length === 0) {
      res.status(400).json({ error: "None of these items are available right now." });
      return;
    }

    const subtotal = priced.reduce((n, l) => n + l.product.price * l.qty, 0);
    const reference = `LG-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        customer_name: data.customerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        delivery_note: data.note || null,
        payment_method: "Bank transfer",
        subtotal,
        delivery_fee: DELIVERY_FEE,
        total: subtotal + DELIVERY_FEE,
        status: "pending",
      })
      .select("id, reference")
      .single();

    if (orderError || !order) {
      res.status(500).json({ error: orderError?.message ?? "Could not create order" });
      return;
    }

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      priced.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        product_name: l.product.name,
        unit_price: l.product.price,
        quantity: l.qty,
      })),
    );

    if (itemsError) {
      res.status(500).json({ error: itemsError.message });
      return;
    }

    for (const line of priced) {
      await supabaseAdmin
        .from("products")
        .update({ stock: Math.max(line.product.stock - line.qty, 0) })
        .eq("id", line.product.id);
    }

    res.status(201).json({ reference: order.reference, total: subtotal + DELIVERY_FEE });
  } catch (err: any) {
    console.error("[Place Order Error]:", err);
    res.status(500).json({ error: err.message || "Failed to place order." });
  }
});

export default router;
