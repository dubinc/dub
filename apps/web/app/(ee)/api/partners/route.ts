import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartners } from "@/lib/api/partners/get-partners";
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
    const { sortBy: sortByWithOldFields, ...parsedParams } =
      getPartnersQuerySchemaExtended
        .merge(
          z.object({
            // add old fields for backward compatibility (clicks, leads, conversions, sales, saleAmount)
            sortBy: getPartnersQuerySchemaExtended.shape.sortBy.or(
              z.enum(["clicks", "leads", "conversions", "sales", "saleAmount"]),
            ),
          }),
        )
        .parse(searchParams);

    // get the final sortBy field (replace old fields with new fields)
    const sortBy =
      {
        clicks: "totalClicks",
        leads: "totalLeads",
        conversions: "totalConversions",
        sales: "totalSales",
        saleAmount: "totalSaleAmount",
      }[sortByWithOldFields] || sortByWithOldFields;

    console.time("getPartners");
    const partners = await getPartners({
      ...parsedParams,
      sortBy,
      programId,
    });
    console.timeEnd("getPartners");

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
