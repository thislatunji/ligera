import { z } from "zod";
import { NOTIFICATION_TYPES } from "@/lib/db/models/notificationLog";

export const NotificationQuery = z.object({
  status: z.enum(["pending", "sent", "failed"]).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  orderId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type NotificationQueryInput = z.infer<typeof NotificationQuery>;
