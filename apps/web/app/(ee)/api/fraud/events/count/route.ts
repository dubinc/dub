import { getFraudEventsCount } from "@/lib/api/fraud/get-fraud-events-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { fraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { NextResponse } from "next/server";

// GET /api/fraud/events/count - get the count of fraud events for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedParams = fraudEventCountQuerySchema.parse(searchParams);

    const fraudEventsCount = await getFraudEventsCount({
      ...parsedParams,
      programId,
    });

    return NextResponse.json(fraudEventsCount);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
