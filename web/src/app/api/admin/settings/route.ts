import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getSettings, updateSettings } from "@/lib/services/admin/settings";
import { SettingsPatch } from "@/lib/api/schemas/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const settings = await getSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = SettingsPatch.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    // Additional validation for specific fields
    if (parsed.data.delivery?.cutOffTime && !/^\d{2}:\d{2}$/.test(parsed.data.delivery.cutOffTime)) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (parsed.data.store?.whatsappNumber && !/^\d{10,14}$/.test(parsed.data.store.whatsappNumber)) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const settings = await updateSettings(parsed.data, auth.userId);
    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
