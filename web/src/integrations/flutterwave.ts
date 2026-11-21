export interface FlutterwaveRefundResult {
  success: boolean;
  data?: any;
  message?: string;
}

export async function refundTransaction(txRefOrId: string, amount?: number): Promise<FlutterwaveRefundResult> {
  // Default mock implementation - can be overridden in tests
  return {
    success: true,
    data: { status: "successful" },
  };
}

export async function verifyTransaction(linkIdOrTxRef: string): Promise<any> {
  return {
    status: "successful",
    amount: 0,
    currency: "NGN",
  };
}
