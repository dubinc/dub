import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partners/count - get the count of partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedParams = partnersCountQuerySchema.parse(searchParams);

    const count = await getPartnersCount({
      ...parsedParams,
      programId,
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
