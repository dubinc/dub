import { receiver, verifySignature } from "@/lib/cron";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateUsage } from "./utils";

// Cron to update the usage stats of each project.
// Runs once every day at 7AM PST (0 14 * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const results = await updateUsage();
    return NextResponse.json(results);
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
