import { verifySignature } from "@/lib/cron";
import { getSearchParams, log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateUsage } from "./utils";

// Cron to update the usage stats of each project.
// Runs once every day at 7AM PST (0 14 * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { skip } = getSearchParams(req.url);

  try {
    await updateUsage(skip ? parseInt(skip) : undefined);

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: "Usage cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
