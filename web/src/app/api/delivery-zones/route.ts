import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";

export async function GET() {
  try {
    await connectDb();
    const zones = await DeliveryZone.find({ active: true }).sort({ sortOrder: 1 }).lean();
    const result = zones.map((z: any) => ({
      id: z._id.toString(),
      name: z.name,
      fee: z.fee,
      etaText: z.etaText,
    }));
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300",
      },
    });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
