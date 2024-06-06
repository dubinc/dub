import { verifySignature } from "@/lib/cron";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateUsage } from "./utils";

// Cron to update the usage stats of each workspace.
// Runs once every day at noon UTC (0 12 * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
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
