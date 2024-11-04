import { getEvents } from "@/lib/analytics/get-events";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/events - get events for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const parsedParams = eventsQuerySchema
      .omit({
        linkId: true,
        externalId: true,
        domain: true,
        root: true,
        key: true,
        tagId: true,
      })
      .parse(searchParams);

    const events = await getEvents({
      ...parsedParams,
      workspaceId: workspace.id, // TODO: use programId instead
    });

    return NextResponse.json(events);
  },
);
