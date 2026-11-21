export function renderOrderCancelledCustomer(payload: any = {}, overrides: any = {}) {
  const orderNumber = payload.orderNumber || payload.order?.orderNumber || "";
  const amount = payload.amount || payload.refundAmount || payload.total || 0;
  const reason = payload.reason || "";
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>Order Cancelled</h1>
    <p>Order Number: ${orderNumber}</p>
    <p>Your order has been cancelled.</p>
    <p><strong>Refund amount:</strong> ₦${amount}</p>
    <p>Refunds will be processed within 3–5 working days to your original payment method.</p>
    ${reason ? `<p>Reason: ${reason}</p>` : ""}
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const orderCancelledCustomer = renderOrderCancelledCustomer;
export default renderOrderCancelledCustomer;
