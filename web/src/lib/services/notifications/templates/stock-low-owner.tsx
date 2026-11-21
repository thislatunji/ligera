export function renderStockLowOwner(payload: any = {}, overrides: any = {}) {
  const productName = payload.productName || payload.product?.name || "";
  const variantName = payload.variantName || payload.variant?.name || "";
  const available = payload.available || payload.stockQty || 0;
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>Low Stock Alert</h1>
    <p>Product: ${productName} ${variantName ? `(${variantName})` : ""}</p>
    <p>Available: ${available}</p>
    <p>Please restock soon.</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const stockLowOwner = renderStockLowOwner;
export default renderStockLowOwner;
