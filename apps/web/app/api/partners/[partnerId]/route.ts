import { DubApiError } from "@/lib/api/errors";
import { getPartnerForProgram } from "@/lib/api/partners/get-partner-for-program";
import { withWorkspace } from "@/lib/auth";
import { EnrolledPartnerSchemaWithExpandedFields } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partners/:id – Get a partner by ID
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { partnerId } = params;
    const { programId } = searchParams;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

    const partner = await getPartnerForProgram({
      programId,
      partnerId,
    });

    if (!partner)
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });

    return NextResponse.json(
      EnrolledPartnerSchemaWithExpandedFields.omit({
        links: true,
      }).parse(partner),
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
