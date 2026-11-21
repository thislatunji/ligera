import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CustomRequestInput } from "@/lib/api/schemas/custom-requests";
import { submitCustomRequest } from "@/lib/services/custom-requests/submit";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: "Please wait a moment before sending another request." }, { status: 429 });
      }
      entry.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await req.json();
    // Handle honeypot before strict validation if needed
    if (body && body._hp && typeof body._hp === "string" && body._hp.length > 0) {
      const result = await submitCustomRequest({ ...(body as any), _hp: body._hp });
      return NextResponse.json({ requestNumber: "CR-000000", expectedResponseTime: "48 hours" }, { status: 201 });
    }
    const parsed = CustomRequestInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    try {
      const result = await submitCustomRequest(parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong.", code: "ERROR" }, { status: 500 });
  }
}
