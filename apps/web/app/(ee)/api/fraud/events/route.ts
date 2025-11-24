import { getGroupedFraudEvents } from "@/lib/api/fraud/get-grouped-fraud-events";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { groupedFraudEventsQuerySchema } from "@/lib/zod/schemas/fraud";
import { NextResponse } from "next/server";

// GET /api/fraud/events - Get the fraud events for a program grouped by rule type
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedParams = groupedFraudEventsQuerySchema.parse(searchParams);

    const fraudEvents = await getGroupedFraudEvents({
      ...parsedParams,
      programId,
    });

    return NextResponse.json(fraudEvents);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
