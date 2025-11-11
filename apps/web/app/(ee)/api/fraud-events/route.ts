import { getFraudEvents } from "@/lib/api/fraud/get-fraud-events";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  fraudEventListQuerySchema,
  fraudEventSchema,
} from "@/lib/zod/schemas/fraud";
import { NextResponse } from "next/server";

// GET /api/fraud-events - get all fraud events for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedParams = fraudEventListQuerySchema.parse(searchParams);

    const fraudEvents = await getFraudEvents({
      ...parsedParams,
      programId,
    });

    return NextResponse.json(
      fraudEvents.map((event) => fraudEventSchema.parse(event)),
    );
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
