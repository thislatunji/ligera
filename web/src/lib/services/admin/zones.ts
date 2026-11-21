import { connectDb } from "@/lib/db/connect";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Order } from "@/lib/db/models/order";
import { ActivityLog } from "@/lib/db/models/activityLog";
import mongoose from "mongoose";

export async function listZones() {
  await connectDb();
  const zones = await DeliveryZone.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return zones;
}

export async function createZone(data: any, userId: string) {
  await connectDb();
  const zone = await DeliveryZone.create(data);
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: "delivery_zone.create",
      entity: { type: "delivery_zone", id: zone._id.toString() },
      before: null,
      after: zone.toObject(),
    });
  } catch (e) {}
  return { id: zone._id.toString() };
}

export async function updateZone(id: string, data: any, userId: string) {
  await connectDb();
  const before = await DeliveryZone.findById(id).lean();
  const zone = await DeliveryZone.findByIdAndUpdate(id, data, { new: true }).lean();
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: "delivery_zone.update",
      entity: { type: "delivery_zone", id },
      before,
      after: zone,
    });
  } catch (e) {}
  return { id };
}

export async function deleteZone(id: string, userId: string) {
  await connectDb();
  // Check if referenced by any order
  const count = await Order.countDocuments({ deliveryZoneId: id });
  if (count > 0) {
    const err: any = new Error("Deactivate this zone instead — past orders use it.");
    err.code = "ZONE_IN_USE";
    throw err;
  }
  const before = await DeliveryZone.findById(id).lean();
  await DeliveryZone.findByIdAndDelete(id);
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: "delivery_zone.delete",
      entity: { type: "delivery_zone", id },
      before,
      after: null,
    });
  } catch (e) {}
  return { ok: true };
}
