import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { QuoteInput } from "@/lib/api/schemas/custom-requests";
import { quoteCustomRequest } from "@/lib/services/custom-requests/quote";

export async function POST(request: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner manages custom requests." }, { status: 403 });
    }
    return auth;
  }

  const resolvedParams = await Promise.resolve((params as any));
  const id = resolvedParams.id;

  try {
    const body = await request.json();
    if (typeof body?.amount === "number" && body.amount < 1000) {
      return NextResponse.json({ error: "Enter an amount of at least ₦1,000.", code: "QUOTE_INVALID" }, { status: 422 });
    }
    const parsed = QuoteInput.safeParse(body);
    if (!parsed.success) {
      // Check if it's amount issue
      const amountIssue = parsed.error.issues.find((i) => i.path.includes("amount"));
      if (amountIssue) {
        return NextResponse.json({ error: "Enter an amount of at least ₦1,000.", code: "QUOTE_INVALID" }, { status: 422 });
      }
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    try {
      const result = await quoteCustomRequest(id, parsed.data, auth);
      return NextResponse.json(result);
    } catch (err: any) {
      if (err.code === "NOT_FOUND") {
        return NextResponse.json({ error: err.message || "Request not found." }, { status: 404 });
      }
      if (err.code === "QUOTE_INVALID" || err.status === 422) {
        return NextResponse.json({ error: err.message || "Enter an amount of at least ₦1,000.", code: "QUOTE_INVALID" }, { status: 422 });
      }
      if (err.code === "INVALID_TRANSITION" || err.status === 409) {
        return NextResponse.json({ error: err.message || "Invalid transition.", code: "INVALID_TRANSITION" }, { status: 409 });
      }
      if (err.code === "PAYMENT_LINK_FAILED" || err.status === 502) {
        return NextResponse.json({ error: err.message || "We couldn't create the payment link. Try again.", code: "PAYMENT_LINK_FAILED" }, { status: 502 });
      }
      throw err;
    }
  } catch (error: any) {
    if (error.code === "PAYMENT_LINK_FAILED") {
      return NextResponse.json({ error: error.message, code: "PAYMENT_LINK_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
