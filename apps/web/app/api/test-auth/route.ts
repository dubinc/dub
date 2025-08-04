import { document } from "@/lib/openapi";
import { redis } from "@/lib/upstash";
import { ERedisArg } from "core/interfaces/redis.interface";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log("body", JSON.stringify(body, null, 2));

  const { sessionId, qrData } = body;
  
  try {
      redis.set(
        `${ERedisArg.QR_DATA_REG}:${sessionId}`,
        JSON.stringify(qrData),
        {  ex: 60 * 10 },
      ).finally();

      return NextResponse.json({ message: "QR data saved to redis" });
    } catch (error) {
      console.error("Error saving QR data to redis:", error);

      return NextResponse.json({ message: "Failed to save QR data" }, { status: 500 });
    }
}


