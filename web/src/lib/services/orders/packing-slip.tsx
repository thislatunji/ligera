import React from "react";
import { renderToString } from "react-dom/server";

export function renderPackingSlip(order: any) {
  const items = Array.isArray(order.items) ? order.items : [];
  const hidePrices = !!order.hidePrices;
  const hasGypsum = items.some((item: any) => {
    const name = (item.name || item.category || "").toLowerCase();
    return name.includes("gypsum");
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packing Slip - ${order.orderNumber || order._id}</title>
  <style>
    @page { size: A5; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; }
    .header { margin-bottom: 20px; }
    .logo { font-weight: bold; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .fragile { background-color: #fff3cd; padding: 10px; margin: 10px 0; border: 1px solid #ffc107; }
    .gift-note { background-color: #f8f9fa; padding: 10px; margin: 10px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Ligera</div>
    <div>Order Number: ${order.orderNumber || order._id}</div>
    <div>Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
  </div>
  
  <div class="customer">
    <strong>Ship To:</strong><br/>
    ${order.customer?.name || ""}<br/>
    ${order.deliveryAddress?.address || ""}<br/>
    ${order.deliveryAddress?.city || ""} ${order.deliveryAddress?.state || ""}<br/>
    ${order.customer?.phone || ""}<br/>
    ${order.deliveryMethod === "pickup" ? "Pickup Order" : (order.deliveryZoneName ? `Zone: ${order.deliveryZoneName}` : "")}
  </div>
  
  ${hasGypsum ? '<div class="fragile"><strong>Fragile — gypsum</strong></div>' : ""}
  
  ${order.giftNote ? `<div class="gift-note"><strong>Gift Note:</strong><br/>${order.giftNote}</div>` : ""}
  
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th>Label</th>
        <th>Qty</th>
        ${hidePrices ? "" : "<th>Unit Price</th><th>Total</th>"}
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item: any) => `
        <tr>
          <td>${item.name || ""}</td>
          <td>${item.sku || ""}</td>
          <td>${item.label || ""}</td>
          <td>${item.qty || 0}</td>
          ${hidePrices ? "" : `<td>${item.unitPrice || 0}</td><td>${(item.unitPrice || 0) * (item.qty || 0)}</td>`}
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  
  <script>window.print();</script>
</body>
</html>`;

  return html;
}

export default renderPackingSlip;
