import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { NotificationQuery } from "@/lib/api/schemas/notifications";
import { Order } from "@/lib/db/models/order";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    // Customize message if it's a staff trying to access
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner can view email logs.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return auth;
  }

  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }

    const parsed = NotificationQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    const { status, type, orderId, dateFrom, dateTo, page, limit } = parsed.data;
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (orderId) filter.orderId = orderId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = dateFrom;
      if (dateTo) filter.createdAt.$lte = dateTo;
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NotificationLog.countDocuments(filter),
    ]);

    const data = await Promise.all(
      rows.map(async (row: any) => {
        let orderNumber: string | undefined;
        if (row.orderId) {
          const order = await Order.findById(row.orderId).select("orderNumber").lean();
          if (order) orderNumber = (order as any).orderNumber;
        }
        return {
          id: row._id.toString(),
          type: row.type,
          recipient: row.recipient,
          status: row.status,
          retryCount: row.retryCount,
          sentAt: row.sentAt ? row.sentAt.toISOString() : undefined,
          lastError: row.lastError || undefined,
          orderNumber,
          createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
