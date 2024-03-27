import { verifySignature } from "@/lib/cron";
import { getSearchParams, log } from "@dub/utils";
import { NextResponse } from "next/server";

// Cron to update the links usage of each workspace.
// Runs once every 5 mins (*/5 * * * *)

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  // TODO – we need to check if any workspace exceeded 80% of their links usage
  // and send a LinkLimitExceeded email
  const { skip } = getSearchParams(req.url);

  try {
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
