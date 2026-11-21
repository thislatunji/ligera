import { connectDb } from "@/lib/db/connect";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { User } from "@/lib/db/models/user";

export async function listActivityLogs(query: any = {}) {
  await connectDb();
  const page = query.page || 1;
  const limit = query.limit || 25;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query.userId) filter.userId = query.userId;
  if (query.action) {
    filter.action = { $regex: "^" + query.action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") };
  }
  if (query.entity) {
    filter["entity.type"] = query.entity;
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
    if (query.dateTo) filter.createdAt.$lte = query.dateTo;
  }

  const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await ActivityLog.countDocuments(filter);

  const result = await Promise.all(
    logs.map(async (log: any) => {
      let userName = "";
      try {
        const user = await User.findById(log.userId).lean();
        userName = user?.name || user?.email || "";
      } catch (e) {}
      return {
        id: log._id.toString(),
        at: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
        userName,
        action: log.action,
        entity: log.entity || { type: "", id: "" },
        before: log.before,
        after: log.after,
      };
    })
  );

  return { data: result, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}
