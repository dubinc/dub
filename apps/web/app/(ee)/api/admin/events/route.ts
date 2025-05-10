import { getEvents } from "@/lib/analytics/get-events";
import { withAdmin } from "@/lib/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/admin/events – get events for admin
export const GET = withAdmin(async ({ searchParams }) => {
  const parsedParams = eventsQuerySchema.parse(searchParams);

  const response = await getEvents(parsedParams);

  return NextResponse.json(response);
});
