import { DubApiError } from "@/lib/api/errors";
import { getPartners } from "@/lib/api/partners/get-partners";
import { withWorkspace } from "@/lib/auth";
import {
  EnrolledPartnerSchemaWithExpandedFields,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
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

    const partners = await getPartners({
      ...partnersQuerySchema.parse({
        pageSize: 1,
        ids: [partnerId],
      }),
      workspaceId: workspace.id,
      programId,
      includeExpandedFields: true,
    });

    if (!partners.length)
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });

    return NextResponse.json(
      EnrolledPartnerSchemaWithExpandedFields.parse(partners[0]),
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
