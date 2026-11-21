import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { createPaymentLink } from "@/lib/integrations/flutterwave";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

export async function quoteCustomRequest(
  id: string,
  input: { amount: number; note?: string; deliveryIncluded?: boolean },
  user?: { userId?: string; name?: string }
) {
  await connectDb();
  const doc = await CustomRequest.findById(id);
  if (!doc) {
    const err: any = new Error("Request not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (input.amount < 1000) {
    const err: any = new Error("Enter an amount of at least ₦1,000.");
    err.code = "QUOTE_INVALID";
    err.status = 422;
    throw err;
  }

  if (doc.status !== "new" && doc.status !== "quoted") {
    if (doc.status === "declined") {
      const err: any = new Error("Declined requests can't be quoted.");
      err.code = "INVALID_TRANSITION";
      err.status = 409;
      throw err;
    }
    const err: any = new Error("Invalid transition.");
    err.code = "INVALID_TRANSITION";
    err.status = 409;
    throw err;
  }

  const txRef = doc.requestNumber; // CR-000123
  let linkResult;
  try {
    linkResult = await createPaymentLink({
      tx_ref: txRef,
      amount: input.amount,
      currency: "NGN",
      customer: {
        email: doc.contact.email,
        name: doc.contact.name,
        phone: doc.contact.phone,
      },
      redirect_url: process.env.FLW_REDIRECT_URL || "https://ligerascents.com/custom-requests/thanks",
      customizations: { title: "Ligera Custom Order" },
    });
  } catch (e: any) {
    const err: any = new Error("We couldn't create the payment link. Try again.");
    err.code = "PAYMENT_LINK_FAILED";
    err.status = 502;
    throw err;
  }

  const paymentLink = {
    linkId: linkResult.linkId || undefined,
    linkUrl: linkResult.link,
    txRef,
    amount: input.amount,
    status: "pending" as const,
  };

  const updates: any = {
    quoteAmount: input.amount,
    paymentLink,
    status: "quoted",
    quotedAt: new Date(),
  };
  const notes: any[] = [];
  if (input.note) {
    notes.push({
      userName: user?.name || "",
      note: input.note,
      at: new Date(),
    });
  }
  notes.push({
    userName: user?.name || "",
    note: `Quote sent: ₦${input.amount}${input.deliveryIncluded !== false ? " (delivery included)" : ""}`,
    at: new Date(),
  });
  updates.$push = { notes: { $each: notes } };

  const updated = await CustomRequest.findByIdAndUpdate(id, updates, { new: true });

  await enqueueNotification("custom_request.quoted.customer", {
    requestNumber: updated?.requestNumber,
    email: updated?.contact?.email,
    name: updated?.contact?.name,
    paymentLinkUrl: paymentLink.linkUrl,
    quoteAmount: input.amount,
    note: input.note,
    deliveryIncluded: input.deliveryIncluded !== false,
  });

  return {
    requestNumber: updated?.requestNumber || doc.requestNumber,
    quoteAmount: input.amount,
    paymentLinkUrl: paymentLink.linkUrl,
    deliveryIncluded: input.deliveryIncluded !== false,
  };
}
