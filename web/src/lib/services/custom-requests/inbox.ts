import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { Order } from "@/lib/db/models/order";

export async function listCustomRequests(query: { status?: string; q?: string } = {}) {
  await connectDb();
  const filter: any = {};
  if (query.status) {
    filter.status = query.status;
  }
  if (query.q) {
    const q = query.q.trim();
    filter.$or = [
      { "contact.email": { $regex: q, $options: "i" } },
      { "contact.name": { $regex: q, $options: "i" } },
      { requestNumber: { $regex: q, $options: "i" } },
    ];
  }
  const docs = await CustomRequest.find(filter).sort({ createdAt: -1 }).lean();
  return docs.map((doc: any) => ({
    id: doc._id.toString(),
    requestNumber: doc.requestNumber,
    contact: doc.contact,
    spaceOrSetting: doc.spaceOrSetting,
    productTypes: doc.productTypes || [],
    quantity: doc.quantity || 1,
    budgetRange: doc.budgetRange || "",
    eventDate: doc.eventDate ? doc.eventDate.toISOString() : undefined,
    status: doc.status,
    quoteAmount: doc.quoteAmount ?? undefined,
    hasImage: !!doc.referenceImage?.url,
    createdAt: doc.createdAt?.toISOString ? doc.createdAt.toISOString() : doc.createdAt,
  }));
}

export async function getCustomRequestById(id: string) {
  await connectDb();
  const doc = await CustomRequest.findById(id).lean();
  if (!doc) return null;
  let orderNumber: string | undefined;
  if ((doc as any).orderId) {
    const order = await Order.findById((doc as any).orderId).lean();
    if (order) orderNumber = (order as any).orderNumber;
  }
  const notes = ((doc as any).notes || [])
    .slice()
    .sort((a: any, b: any) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return tb - ta; // reverse chron
    })
    .map((n: any) => ({
      userName: n.userName || "",
      note: n.note || "",
      at: n.at ? (n.at.toISOString ? n.at.toISOString() : n.at) : "",
    }));
  return {
    id: (doc as any)._id.toString(),
    requestNumber: (doc as any).requestNumber,
    contact: (doc as any).contact,
    spaceOrSetting: (doc as any).spaceOrSetting,
    productTypes: (doc as any).productTypes || [],
    quantity: (doc as any).quantity || 1,
    budgetRange: (doc as any).budgetRange || "",
    eventDate: (doc as any).eventDate ? (doc as any).eventDate.toISOString() : undefined,
    status: (doc as any).status,
    quoteAmount: (doc as any).quoteAmount ?? undefined,
    hasImage: !!(doc as any).referenceImage?.url,
    createdAt: (doc as any).createdAt?.toISOString ? (doc as any).createdAt.toISOString() : (doc as any).createdAt,
    scentPreferences: (doc as any).scentPreferences,
    referenceImage: (doc as any).referenceImage?.url
      ? { url: (doc as any).referenceImage.url, alt: (doc as any).referenceImage.alt || "" }
      : undefined,
    paymentLink: (doc as any).paymentLink?.linkUrl
      ? {
          linkUrl: (doc as any).paymentLink.linkUrl,
          txRef: (doc as any).paymentLink.txRef,
          amount: (doc as any).paymentLink.amount,
          status: (doc as any).paymentLink.status,
        }
      : undefined,
    orderId: (doc as any).orderId ? (doc as any).orderId.toString() : undefined,
    orderNumber,
    quotedAt: (doc as any).quotedAt ? ((doc as any).quotedAt.toISOString ? (doc as any).quotedAt.toISOString() : (doc as any).quotedAt) : undefined,
    notes,
    expectedResponseTime: "48 hours" as const,
  };
}
