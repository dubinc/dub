import { getEvents } from "@/lib/analytics/get-events";
import { withAuth } from "@/lib/referrals/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/events/client - get events for the current link
export const GET = withAuth(async ({ searchParams, workspace, link }) => {
  const parsedParams = eventsQuerySchema.parse(searchParams);

  const response = await getEvents({
    ...parsedParams,
    linkId: link.id,
    workspaceId: workspace.id,
  });

  return NextResponse.json(response);
});
