import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId] - get a partner by id
export const GET = withWorkspace(
  async ({ workspace, searchParams, params }) => {
    const { programId } = searchParams;
    const { partnerId } = params;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      include: {
        partner: true,
        program: true,
        links: true,
      },
    });

    const { program, links } = programEnrollment;

    const earnings = links?.reduce((acc, link) => {
      return (
        acc +
        ((program.commissionType === "percentage"
          ? link?.saleAmount
          : link?.sales) ?? 0) *
          (program.commissionAmount / 100)
      );
    }, 0);

    const partner = {
      ...programEnrollment.partner,
      ...programEnrollment,
      id: programEnrollment.partnerId,
      earnings,
    };

    return NextResponse.json(EnrolledPartnerSchema.parse(partner));
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "enterprise",
    ],
  },
);
