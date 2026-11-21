import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Variant } from "@/lib/db/models/variant";

export async function releaseExpiredHolds() {
  const now = new Date();
  const expiredOrders = await Order.find({
    status: "pending_payment",
    holdExpiresAt: { $lt: now },
  })
    .limit(100)
    .lean();

  for (const order of expiredOrders) {
    try {
      // Guard
      const updated = await Order.findOneAndUpdate(
        { _id: order._id, status: "pending_payment" },
        {
          status: "abandoned",
          $push: { statusTimeline: { status: "abandoned", at: new Date() } },
        },
        { new: true }
      );
      if (!updated) {
        continue; // webhook won the race
      }

      const payment = await Payment.findOne({ orderId: order._id });
      // Check if payment was successful - if so skip? step says if payment.status successful skip
      if (payment?.status === "successful") {
        continue;
      }

      // Release holds for each item
      for (const item of (updated.items || order.items) as any[]) {
        try {
          await Variant.findOneAndUpdate(
            { _id: item.variantId, heldQty: { $gte: item.qty } },
            { $inc: { heldQty: -item.qty } }
          );
        } catch (_) {}
      }

      if (payment) {
        if (payment.status !== "failed") {
          await Payment.findByIdAndUpdate(payment._id, { status: "abandoned" });
        } else {
          // already failed
        }
      }
    } catch (err) {
      console.error("Error releasing hold for order", order._id, err);
      // continue
    }
  }
}
