import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/monitoring/timeseries – get monitoring timeseries data
export const GET = withAuth(async ({ req, project }) => {
  // if (!project.monitoringId) {
  //   return new Response("No monitoring schedule found", { status: 404 });
  // }

  let url = new URL(
    `https://api.us-east.tinybird.co/v0/pipes/monitoring_timeseries.json`,
  );
  url.searchParams.append("project_id", project.id);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
    },
  })
    .then((res) => res.json())
    .then(({ data }) => data);

  return NextResponse.json(response);
});
