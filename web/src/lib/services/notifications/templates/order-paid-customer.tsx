export function renderOrderPaidCustomer(payload: any = {}, overrides: any = {}) {
  const orderNumber = payload.orderNumber || payload.order?.orderNumber || payload.orderNumber;
  const items = payload.items || payload.order?.items || [];
  const deliveryFee = payload.deliveryFee ?? payload.order?.deliveryFee ?? payload.delivery_fee ?? 0;
  const total = payload.total ?? payload.order?.total ?? 0;
  const address = payload.deliveryAddress || payload.order?.deliveryAddress || payload.address || {};
  const deliveryWindow = payload.expectedDeliveryWindow || payload.order?.expectedDeliveryWindow || payload.deliveryWindow || "";
  
  let itemsHtml = "";
  if (Array.isArray(items)) {
    itemsHtml = items.map((item: any) => 
      `<div class="item-line">${item.name || item.productName || item.title || ""} ${(item.variantName || item.variant) ? `(${item.variantName || item.variant})` : ""} x${item.quantity || 1} - ₦${item.price || item.unitPrice || item.total || 0}</div>`
    ).join("");
  }
  
  const addressStr = typeof address === 'string' ? address : `${address.line1 || address.address || ''} ${address.city || ''} ${address.state || ''}`.trim();
  
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:Inter,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:600px;background:#FFFFFF;" cellpadding="0" cellspacing="0">
        <tr><td style="padding:40px;text-align:center;"><div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;">LIGERA</div></td></tr>
        <tr><td style="padding:0 40px 40px 40px;">
          <h1 style="font-family:Fraunces,Georgia,serif;">${overrides.subject || "Payment received - Your order is confirmed"}</h1>
          <p>Thank you for your order!</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <div class="items">${itemsHtml}</div>
          <p><strong>Delivery fee:</strong> ₦${deliveryFee}</p>
          <p><strong>Total:</strong> ₦${total}</p>
          <p><strong>Address:</strong> ${addressStr}</p>
          ${deliveryWindow ? `<p><strong>Delivery window:</strong> ${deliveryWindow}</p>` : `<p><strong>Delivery window:</strong> ${deliveryWindow || payload.deliveryWindow || ''}</p>`}
          <p>Contact us if you have any questions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  
  return html;
}

export const orderPaidCustomer = renderOrderPaidCustomer;
export default renderOrderPaidCustomer;
