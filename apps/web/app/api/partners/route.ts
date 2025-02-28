import { DubApiError } from "@/lib/api/errors";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners - get all partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { programId } = searchParams;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const {
      status,
      country,
      search,
      tenantId,
      ids,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = partnersQuerySchema.parse(searchParams);

    const sortColumnsMap = {
      createdAt: "pe.createdAt",
      clicks: "totalClicks",
      leads: "totalLeads",
      sales: "totalSales",
      saleAmount: "totalSaleAmount",
      earnings: "totalSaleAmount",
    };

    const partners = (await prisma.$queryRaw`
      SELECT 
        p.*, 
        pe.id as enrollmentId, 
        pe.status, 
        pe.programId, 
        pe.partnerId, 
        pe.tenantId,
        pe.applicationId,
        pe.createdAt as enrollmentCreatedAt,
        COALESCE(SUM(l.clicks), 0) as totalClicks,
        COALESCE(SUM(l.leads), 0) as totalLeads,
        COALESCE(SUM(l.sales), 0) as totalSales,
        COALESCE(SUM(l.saleAmount), 0) as totalSaleAmount,
        JSON_ARRAYAGG(
          IF(l.id IS NOT NULL,
            JSON_OBJECT(
              'id', l.id,
              'domain', l.domain,
              'key', l.key,
              'shortLink', l.shortLink,
              'url', l.url,
              'clicks', CAST(l.clicks AS SIGNED),
              'leads', CAST(l.leads AS SIGNED),
              'sales', CAST(l.sales AS SIGNED),
              'saleAmount', CAST(l.saleAmount AS SIGNED)
            ),
            NULL
          )
        ) as links
      FROM 
        ProgramEnrollment pe 
      INNER JOIN 
        Partner p ON p.id = pe.partnerId 
      LEFT JOIN 
        Link l ON l.programId = pe.programId AND l.partnerId = pe.partnerId
      WHERE 
        pe.programId = ${program.id}
        ${status ? Prisma.sql`AND pe.status = ${status}` : Prisma.sql`AND pe.status != 'rejected'`}
        ${tenantId ? Prisma.sql`AND pe.tenantId = ${tenantId}` : Prisma.sql``}
        ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.sql``}
        ${search ? Prisma.sql`AND (LOWER(p.name) LIKE LOWER(${`%${search}%`}) OR LOWER(p.email) LIKE LOWER(${`%${search}%`}))` : Prisma.sql``}
        ${ids && ids.length > 0 ? Prisma.sql`AND pe.partnerId IN (${Prisma.join(ids)})` : Prisma.sql``}
      GROUP BY 
        p.id, pe.id
      ORDER BY ${Prisma.raw(sortColumnsMap[sortBy])} ${Prisma.raw(sortOrder)}
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`) satisfies Array<any>;

    const response = partners.map((partner) => {
      return {
        ...partner,
        createdAt: new Date(partner.enrollmentCreatedAt),
        payoutsEnabled: Boolean(partner.payoutsEnabled),
        clicks: Number(partner.totalClicks),
        leads: Number(partner.totalLeads),
        sales: Number(partner.totalSales),
        saleAmount: Number(partner.totalSaleAmount),
        links: partner.links.filter((link: any) => link !== null),
      };
    });

    return NextResponse.json(z.array(EnrolledPartnerSchema).parse(response));
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

// POST /api/partners - add a partner for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const data = createPartnerSchema.parse(await parseRequestBody(req));

    const { programId } = data;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const partnerLink = await createPartnerLink({
      workspace,
      program,
      partner: data,
      userId: session.user.id,
    });

    const partner = await enrollPartner({
      program,
      tenantId: data.tenantId,
      workspace,
      link: partnerLink,
      partner: data,
    });

    return NextResponse.json(partner, {
      status: 201,
    });
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
