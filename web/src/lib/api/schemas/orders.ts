import { z } from "zod";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
  "abandoned",
] as const;

export const PAYMENT_STATUSES = ["pending", "successful", "failed", "refunded"] as const;

export const AdminOrderQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  zoneId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  q: z.string().trim().max(60).optional(),
  view: z.enum(["actionable", "failed_abandoned", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const StatusUpdate = z.object({
  status: z.enum(["processing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled", "refunded"]),
  note: z.string().max(300).optional(),
  emailCustomer: z.boolean().default(true),
});

export const CancelInput = z.object({
  reason: z.string().trim().min(3).max(300),
  restoreStock: z.boolean().optional(),
});

export const RefundInput = z.object({
  amount: z.number().int().positive().optional(),
  note: z.string().max(300).optional(),
});

export const ExportQuery = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
});
