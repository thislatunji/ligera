export function renderCustomRequestQuotedCustomer(payload: any = {}, overrides: any = {}) {
  const requestNumber = payload.requestNumber || payload.customRequest?.requestNumber || "";
  const paymentLink = payload.paymentLink || payload.paymentUrl || payload.link || "#";
  const quoteAmount = payload.quoteAmount || payload.amount || 0;
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>Your Custom Quote is Ready</h1>
    <p>Request Number: ${requestNumber}</p>
    <p>Quote Amount: ₦${quoteAmount}</p>
    <p><a href="${paymentLink}" style="display:inline-block;padding:12px 24px;background-color:#B08D57;color:#FFFFFF;text-decoration:none;border-radius:4px;">Pay to Accept Quote</a></p>
    <p>Payment link: ${paymentLink}</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const customRequestQuotedCustomer = renderCustomRequestQuotedCustomer;
export default renderCustomRequestQuotedCustomer;
