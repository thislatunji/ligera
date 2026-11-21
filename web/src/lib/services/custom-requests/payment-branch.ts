import { CustomRequest } from "@/lib/db/models/customRequest";
import { Order } from "@/lib/db/models/order";
import { nextNumber } from "@/lib/db/models/counter";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { verifyTransaction } from "@/lib/integrations/flutterwave";

export async function handleCustomRequestPayment(body: any) {
  const txRef = body?.data?.tx_ref || body?.tx_ref;
  if (!txRef || !txRef.startsWith("CR-")) {
    return { ok: true };
  }

  const requestNumber = txRef;
  const request = await CustomRequest.findOne({ requestNumber });
  if (!request) {
    return { ok: true };
  }

  let verifiedStatus = body?.data?.status;
  let verifiedAmount = body?.data?.amount;
  const verifiedCurrency = body?.data?.currency || "NGN";

  try {
    if (body?.data?.id) {
      const verified = await verifyTransaction(body.data.id);
      if (verified?.status) verifiedStatus = verified.status;
      if (verified?.amount !== undefined) verifiedAmount = verified.amount;
    }
  } catch (err: any) {
    if (err.message?.includes("verify failed")) {
      throw err;
    }
  }

  // Handle failed payment
  if (verifiedStatus === "failed" || body?.event === "charge.failed") {
    if (request.paymentLink?.status !== "successful") {
      request.paymentLink = request.paymentLink || {};
      (request.paymentLink as any).status = "failed";
      await request.save();
    }
    return { ok: true };
  }

  // Check amount mismatch
  if (request.quoteAmount != null && verifiedAmount != null && Number(verifiedAmount) !== Number(request.quoteAmount)) {
    await enqueueNotification("payment.mismatch.owner", {
      requestNumber,
      tx_ref: txRef,
      amount: verifiedAmount,
      expected: request.quoteAmount,
    });
    return { ok: true };
  }

  // Idempotency - if already successful and order exists or processed
  if (request.paymentLink?.status === "successful") {
    return { ok: true };
  }
  if (request.orderId) {
    return { ok: true };
  }

  // Try to atomically mark as accepted/successful if not already processed
  const updated = await CustomRequest.findOneAndUpdate(
    { requestNumber, orderId: null, "paymentLink.status": { $ne: "successful" } },
    {
      "paymentLink.status": "successful",
      status: "accepted",
      $push: {
        notes: {
          userName: "System",
          note: "Payment received via custom order payment link.",
          at: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    // Already processed
    const existing = await CustomRequest.findOne({ requestNumber });
    if (existing?.orderId) {
      return { ok: true };
    }
    // Try to get fresh
    const fresh = await CustomRequest.findOne({ requestNumber });
    if (fresh?.paymentLink?.status === "successful" && fresh?.orderId) {
      return { ok: true };
    }
    // If it was marked successful but no order, proceed to create? Or return
    const toProcess = fresh || request;
    if (toProcess.paymentLink?.status === "successful" && toProcess.orderId) {
      return { ok: true };
    }
  }

  const requestToUse = updated || (await CustomRequest.findOne({ requestNumber }));
  if (!requestToUse) return { ok: true };
  if (requestToUse.orderId) return { ok: true };
  if (requestToUse.paymentLink?.status !== "successful") {
    // make sure it's marked successful
  }

  // Create order
  const orderNumber = await nextNumber("order");
  const items = [
    {
      name: `Custom order — ${requestToUse.requestNumber}`,
      sku: `CR-${requestToUse.requestNumber.replace("CR-", "")}`,
      unitPrice: requestToUse.quoteAmount || requestToUse.paymentLink?.amount || verifiedAmount || 0,
      qty: requestToUse.quantity || 1,
      productId: null,
      variantId: null,
    },
  ];
  const total = requestToUse.quoteAmount || requestToUse.paymentLink?.amount || verifiedAmount || 0;

  const order = await Order.create({
    orderNumber,
    status: "paid",
    paymentStatus: "successful",
    total,
    subtotal: total,
    deliveryFee: 0,
    discount: 0,
    customer: requestToUse.contact,
    items,
    source: "custom_request",
    statusTimeline: [{ status: "paid", at: new Date() }],
  });

  // Link back
  await CustomRequest.findOneAndUpdate({ requestNumber, orderId: null }, { orderId: order._id });

  await enqueueNotification("order.paid.customer", { orderId: order._id, orderNumber: order.orderNumber });
  await enqueueNotification("order.paid.owner", { orderId: order._id, orderNumber: order.orderNumber });

  return { ok: true };
}
