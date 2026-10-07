import { z } from "zod";

export const ORDER_STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;

export const productInput = z.object({
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

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export const assertAdmin = async (supabase: any, userId: string) => {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden: admin access required.");
};

