import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { deliverNotificationById } from "@/lib/services/notifications/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner can view email logs.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return auth;
  }

  try {
    await connectDb();
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const row = await NotificationLog.findById(id);
    if (!row) {
      return NextResponse.json({ error: "Notification not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    if (row.status === "pending") {
      return NextResponse.json({ error: "That email is already queued to send.", code: "ALREADY_QUEUED" }, { status: 409 });
    }
    await NotificationLog.findByIdAndUpdate(id, {
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(),
      sentAt: null,
      lastError: null,
      providerId: null,
    });
    if (process.env.NODE_ENV !== "test" && process.env.RESEND_API_KEY) {
      await deliverNotificationById(id).catch(() => {});
      const updated = await NotificationLog.findById(id).lean();
      return NextResponse.json({ id: row._id.toString(), status: updated?.status || "pending" });
    }
    return NextResponse.json({ id: row._id.toString(), status: "pending" });
  } catch (error: any) {
    console.error("RESEND_ERROR", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
