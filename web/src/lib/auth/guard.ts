import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./jwt";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";

export interface AuthContext {
  userId: string;
  role: "owner" | "staff";
  email: string;
  name: string;
}

export async function requireAuth(request: NextRequest, allowedRoles?: ("owner" | "staff")[]): Promise<AuthContext | NextResponse> {
  try {
    const token = request.cookies.get("ligera_at")?.value;
    if (!token) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }
    const payload = await verifyAccessToken(token);
    await connectDb();
    const user = await User.findById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "You do not have access to this.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
  }
}

export function requireRole(role: "owner" | "staff") {
  return (request: NextRequest) => requireAuth(request, [role]);
}
