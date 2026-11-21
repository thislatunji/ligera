export function renderOrderPaidOwner(payload: any = {}, overrides: any = {}) {
  const orderNumber = payload.orderNumber || payload.order?.orderNumber || "";
  const total = payload.total ?? payload.order?.total ?? 0;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>New Order Paid</h1>
    <p>Order Number: ${orderNumber}</p>
    <p>Total: ₦${total}</p>
    <p>A new order has been paid and requires processing.</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const orderPaidOwner = renderOrderPaidOwner;
export default renderOrderPaidOwner;
