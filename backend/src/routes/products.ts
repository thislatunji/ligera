import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

// GET /api/products - list all active products with image signed URLs
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, slug, name, notes, category, price, stock, image_path")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const products = await Promise.all(
      (data ?? []).map(async (p) => {
        let imageUrl: string | null = null;
        if (p.image_path) {
          const { data: signedData } = await supabaseAdmin.storage
            .from("product-images")
            .createSignedUrl(p.image_path, 60 * 60 * 6);
          imageUrl = signedData?.signedUrl ?? null;
        }

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          notes: p.notes,
          category: p.category,
          price: p.price,
          stock: p.stock,
          imageUrl,
        };
      }),
    );

    res.json(products);
  } catch (err: any) {
    console.error("[Get Products Error]:", err);
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
});

export default router;
