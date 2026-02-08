import { DubApiError } from "@/lib/api/errors";
import { getPartnerForProgram } from "@/lib/api/partner-profile/get-partner-for-program";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { EnrolledPartnerSchemaExtended } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId – Get a partner by ID
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const partner = await getPartnerForProgram({
      programId,
      partnerId,
    });

    if (!partner)
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });

    return NextResponse.json(EnrolledPartnerSchemaExtended.parse(partner));
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
