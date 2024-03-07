import { verifySignature } from "@/lib/cron";
import { NextResponse } from "next/server";
import { updateProjectUsage } from "../utils";

export const runtime = "edge";

export async function GET(req: Request) {
  const validSignature = await verifySignature(req);
  if (!validSignature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = (await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/pipes/cron_clicks_usage.json`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    },
  )
    .then((res) => res.json())
    .then(({ data }) => data)) as {
    project_id: string;
    clicks: number;
  }[];

  await Promise.allSettled(
    data.map(({ project_id: projectId, clicks }) =>
      updateProjectUsage({
        projectId,
        clicks,
      }),
    ),
  );

  return NextResponse.json(data);
}
