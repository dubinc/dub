import { getFraudEventOrThrow } from "@/lib/api/fraud/get-fraud-event-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { FraudEventSchema } from "@/lib/zod/schemas/fraud";
import { NextResponse } from "next/server";

// GET /api/fraud-events/:fraudEventId – Get a fraud event by ID
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { fraudEventId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEvent = await getFraudEventOrThrow({
      fraudEventId,
      programId,
    });

    return NextResponse.json(FraudEventSchema.parse(fraudEvent));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
