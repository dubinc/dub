import { receiver, verifySignature } from "@/lib/cron";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateUsage } from "./utils";

// Cron to update the usage stats of each workspace.
// Runs once every day at noon UTC (0 12 * * *)

export async function GET(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const validSignature = await verifySignature(req);
    if (!validSignature) {
      const isValid = await receiver.verify({
        signature: req.headers.get("Upstash-Signature") || "",
        body: JSON.stringify(body),
      });
      if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
  }

  try {
    await updateUsage();

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "errors",
    });
    return NextResponse.json({ error: error.message });
  }
}
