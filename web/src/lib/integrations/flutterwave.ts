const FLW_BASE_URL = "https://api.flutterwave.com/v3";

export interface CreatePaymentLinkParams {
  tx_ref: string;
  amount: number;
  currency?: string;
  customer: {
    email: string;
    name: string;
    phone: string;
  };
  redirect_url: string;
  customizations?: {
    title?: string;
    logo?: string;
  };
}

export async function createPaymentLink(params: CreatePaymentLinkParams) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const res = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.tx_ref,
      amount: params.amount,
      currency: params.currency || "NGN",
      customer: params.customer,
      redirect_url: params.redirect_url,
      customizations: params.customizations || { title: "Ligera" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Flutterwave payment link creation failed: ${res.status}`);
  }

  const data = await res.json();
  const link = data?.data?.link || data?.data?.authorization?.redirect || data?.link;
  const linkId = data?.data?.id || data?.data?.link_id || null;
  return { link, linkId, raw: data };
}

export async function verifyTransaction(transactionId: number | string) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const res = await fetch(`${FLW_BASE_URL}/transactions/verify/${transactionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Flutterwave verify failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.data || data;
}

export async function refundTransaction(transactionId: number | string, amount?: number) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const body: any = {};
  if (amount !== undefined) {
    body.amount = amount;
  }

  const res = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Flutterwave refund failed: ${res.status}`);
  }

  const data = await res.json();
  return data?.data || data;
}
