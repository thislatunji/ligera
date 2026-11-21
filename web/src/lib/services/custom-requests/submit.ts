import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { nextNumber } from "@/lib/db/models/counter";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { CustomRequestInput } from "@/lib/api/schemas/custom-requests";

export async function submitCustomRequest(input: CustomRequestInput & { _hp?: string }) {
  await connectDb();

  // Honeypot check - if filled, return dummy response without creating document
  if (input._hp && input._hp.length > 0) {
    return { requestNumber: "CR-000000", expectedResponseTime: "48 hours" as const };
  }

  const requestNumber = await nextNumber("custom_request");

  const doc = await CustomRequest.create({
    requestNumber,
    contact: input.contact,
    spaceOrSetting: input.spaceOrSetting,
    productTypes: input.productTypes,
    scentPreferences: input.scentPreferences,
    quantity: input.quantity ?? 1,
    budgetRange: input.budgetRange ?? "",
    eventDate: input.eventDate ?? null,
    referenceImage: input.referenceImage
      ? {
          publicId: input.referenceImage.publicId,
          url: input.referenceImage.url,
          alt: input.referenceImage.alt || "Reference image for custom request",
        }
      : undefined,
    status: "new",
  });

  await enqueueNotification("custom_request.submitted.customer", {
    requestNumber: doc.requestNumber,
    email: doc.contact.email,
    name: doc.contact.name,
  });
  await enqueueNotification("custom_request.submitted.owner", {
    requestNumber: doc.requestNumber,
    email: doc.contact.email,
    name: doc.contact.name,
    phone: doc.contact.phone,
  });

  return { requestNumber: doc.requestNumber, expectedResponseTime: "48 hours" as const };
}
