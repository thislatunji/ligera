export function renderCustomRequestSubmittedCustomer(payload: any = {}, overrides: any = {}) {
  const requestNumber = payload.requestNumber || payload.customRequest?.requestNumber || payload.customRequestNumber || "";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>Custom Request Received</h1>
    <p>Request Number: ${requestNumber}</p>
    <p>We have received your custom request and will review it shortly.</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export function renderCustomRequestSubmittedOwner(payload: any = {}, overrides: any = {}) {
  const requestNumber = payload.requestNumber || payload.customRequest?.requestNumber || "";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#FAF7F2;">
  <table width="100%"><tr><td align="center"><table style="max-width:600px;background:#FFFFFF;"><tr><td style="padding:40px;">
    <div style="color:#B08D57;font-size:32px;font-family:Fraunces,Georgia,serif;text-align:center;">LIGERA</div>
    <h1>New Custom Request</h1>
    <p>Request Number: ${requestNumber}</p>
    <p>A new custom request has been submitted.</p>
  </td></tr></table></td></tr></table>
</body></html>`;
  return html;
}

export const customRequestSubmittedCustomer = renderCustomRequestSubmittedCustomer;
export const customRequestSubmittedOwner = renderCustomRequestSubmittedOwner;
export default renderCustomRequestSubmittedCustomer;
