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
  meta?: Record<string, unknown>;
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function createPaymentLink(params: CreatePaymentLinkParams) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const payloadBody: Record<string, unknown> = {
    tx_ref: params.tx_ref,
    amount: params.amount,
    currency: params.currency || "NGN",
    customer: {
      email: params.customer.email,
      name: params.customer.name,
      phonenumber: params.customer.phone,
    },
    redirect_url: params.redirect_url,
    customizations: params.customizations || { title: "Ligera" },
  };
  if (params.meta) {
    payloadBody.meta = params.meta;
  }

  const res = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloadBody),
  });

  const data = await parseJsonSafely(res);
  const link = data?.data?.link || data?.data?.authorization?.redirect || data?.link;
  if (!res.ok || data?.status !== "success" || !link) {
    const detail = data?.message ? `: ${data.message}` : "";
    throw new Error(`Flutterwave payment link creation failed (${res.status})${detail}`);
  }

  const linkId = data?.data?.id || data?.data?.link_id || null;
  return { link, linkId, raw: data };
}

export async function verifyTransaction(transactionId: number | string) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const res = await fetch(
    `${FLW_BASE_URL}/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Flutterwave verify failed: ${res.status}`);
  }

  const data = await parseJsonSafely(res);
  return data?.data || data;
}

export async function verifyTransactionByReference(txRef: string) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new Error("FLW_SECRET_KEY not configured");
  }

  const res = await fetch(
    `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const payload = await parseJsonSafely(res);
  if (!res.ok || payload?.status !== "success") {
    const message = String(payload?.message || "").toLowerCase();
    if (message.includes("not found") || message.includes("no transaction was found")) {
      return { status: "pending", tx_ref: txRef };
    }
    throw new Error(`Flutterwave verify failed: ${res.status}`);
  }

  return payload?.data || payload;
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
