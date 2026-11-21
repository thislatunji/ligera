import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("db not available");
    }
    const admin = typeof db.admin === "function" ? db.admin() : (db as any).admin;
    if (!admin || typeof admin.ping !== "function") {
      throw new Error("ping not available");
    }
    await admin.ping();
    return NextResponse.json({ status: "ok", db: "up" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
