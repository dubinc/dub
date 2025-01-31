import { DubApiError } from "@/lib/api/errors";
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

    if (programEnrollment.program.workspaceId !== workspace.id) {
      throw new DubApiError({
        code: "not_found",
        message: "Program not found.",
      });
    }

    const { program, links } = programEnrollment;

    const totalClicks = links?.reduce((acc, link) => {
      return acc + (link?.clicks ?? 0);
    }, 0);

    const totalLeads = links?.reduce((acc, link) => {
      return acc + (link?.leads ?? 0);
    }, 0);

    const totalSales = links?.reduce((acc, link) => {
      return acc + (link?.sales ?? 0);
    }, 0);

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
      clicks: totalClicks,
      leads: totalLeads,
      sales: totalSales,
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
