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

    const { totalClicks, totalLeads, totalSales, totalSaleAmount, earnings } =
      links?.reduce(
        (acc, link) => {
          const clicks = link?.clicks ?? 0;
          const leads = link?.leads ?? 0;
          const sales = link?.sales ?? 0;
          const saleAmount = link?.saleAmount ?? 0;
          const commission = program.commissionAmount / 100;

          acc.totalClicks += clicks;
          acc.totalLeads += leads;
          acc.totalSales += sales;
          acc.totalSaleAmount += saleAmount;
          acc.earnings +=
            (program.commissionType === "percentage" ? saleAmount : sales) *
            commission;

          return acc;
        },
        {
          totalClicks: 0,
          totalLeads: 0,
          totalSales: 0,
          totalSaleAmount: 0,
          earnings: 0,
        },
      ) || {};

    const partner = {
      ...programEnrollment.partner,
      ...programEnrollment,
      id: programEnrollment.partnerId,
      clicks: totalClicks,
      leads: totalLeads,
      sales: totalSales,
      saleAmount: totalSaleAmount,
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
