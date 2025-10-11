import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartnersNew } from "@/lib/api/partners/get-partners-new";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  getPartnersQuerySchemaExtended,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners - get all partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const parsedParams = getPartnersQuerySchemaExtended.parse(searchParams);

    console.time("getPartnersNew");
    const partners = await getPartnersNew({
      ...parsedParams,
      programId,
    });
    console.timeEnd("getPartnersNew");

    // polyfill deprecated fields for backward compatibility
    return NextResponse.json(
      z
        .array(
          EnrolledPartnerSchema.extend({
            clicks: z.number().default(0),
            leads: z.number().default(0),
            conversions: z.number().default(0),
            sales: z.number().default(0),
            saleAmount: z.number().default(0),
          }),
        )
        .parse(
          partners.map((partner) => ({
            ...partner,
            clicks: partner.totalClicks,
            leads: partner.totalLeads,
            conversions: partner.totalConversions,
            sales: partner.totalSales,
            saleAmount: partner.totalSaleAmount,
          })),
        ),
    );
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

// POST /api/partners - add a partner for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { linkProps: link, ...partner } = createPartnerSchema.parse(
      await parseRequestBody(req),
    );

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const enrolledPartner = await createAndEnrollPartner({
      workspace,
      program,
      partner,
      link,
      userId: session.user.id,
    });

    return NextResponse.json(enrolledPartner, {
      status: 201,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
