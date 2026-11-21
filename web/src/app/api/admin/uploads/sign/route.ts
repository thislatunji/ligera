import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { UploadSignRequest } from "@/lib/api/schemas/auth";
import { signUpload } from "@/lib/cloudinary/sign";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  // Allow staff and owner
  if (authResult.role !== "owner" && authResult.role !== "staff") {
    return NextResponse.json({ error: "You do not have access to this.", code: "AUTH_FORBIDDEN" }, { status: 403 });
  }

  try {
    await connectDb();
    const body = await request.json().catch(() => ({}));
    const parsed = UploadSignRequest.safeParse(body);
    const folder = parsed.success ? parsed.data.folder : "ligera";

    const signatureData = signUpload({ folder });

    try {
      await ActivityLog.create({
        userId: authResult.userId,
        action: "upload.sign",
        entity: { type: "upload", id: signatureData.timestamp.toString() },
        before: null,
        after: null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json(signatureData, { status: 200 });
  } catch (error: any) {
    const signatureData = signUpload({ folder: "ligera" });
    return NextResponse.json(signatureData, { status: 200 });
  }
}
