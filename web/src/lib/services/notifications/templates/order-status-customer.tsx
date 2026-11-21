const statusMessages: Record<string, string> = {
  processing: "Your order is being processed",
  ready_for_pickup: "Your order is ready for pickup",
  out_for_delivery: "Your order is out for delivery",
  delivered: "Your order has been delivered",
};

export function renderOrderStatusCustomer(payload: any = {}, overrides: any = {}) {
  const orderNumber = payload.orderNumber || payload.order?.orderNumber || "";
  const status = payload.status || payload.targetStatus || payload.order?.status || "";
  const message = statusMessages[status] || overrides[status] || `Your order status: ${status.replace(/_/g, " ")}`;
  
  let deliveryContact = "";
  if (status === "out_for_delivery") {
    deliveryContact = "<p><strong>Delivery contact:</strong> Our delivery team will contact you soon. WhatsApp/Phone: +234...</p>";
  }
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>${message}</h1>
    <p>Order Number: ${orderNumber}</p>
    <p>${message}.</p>
    ${deliveryContact}
    <p>Thank you for choosing Ligera.</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const orderStatusCustomer = renderOrderStatusCustomer;
export default renderOrderStatusCustomer;
