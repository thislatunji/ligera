import type { NotificationType } from "@/lib/db/models/notificationLog";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  recipient: string;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  sentAt?: string;
  lastError?: string;
  orderNumber?: string;
  createdAt: string;
}

export interface SendEmailCommand {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers: { "X-Entity-Ref": string };
}
