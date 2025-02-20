import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
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
        pe.createdAt as enrollmentCreatedAt,
        COALESCE(SUM(DISTINCT l.clicks), 0) as totalClicks,
        COALESCE(SUM(DISTINCT l.leads), 0) as totalLeads,
        COALESCE(SUM(DISTINCT l.sales), 0) as totalSales,
        COALESCE(SUM(c.amount), 0) as totalSaleAmount,
        COALESCE(SUM(c.earnings), 0) as totalEarnings,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', l2.id,
              'domain', l2.domain,
              'key', l2.key,
              'shortLink', l2.shortLink,
              'url', l2.url,
              'clicks', CAST(l2.clicks AS SIGNED),
              'leads', CAST(l2.leads AS SIGNED),
              'sales', CAST(l2.sales AS SIGNED),
              'saleAmount', CAST(l2.saleAmount AS SIGNED)
            )
          )
          FROM (
            SELECT DISTINCT l.id, l.domain, l.key, l.shortLink, l.url, l.clicks, l.leads, l.sales, l.saleAmount
            FROM Link l
            WHERE l.programId = pe.programId AND l.partnerId = pe.partnerId
          ) l2
        ) as links
      FROM 
        ProgramEnrollment pe 
      INNER JOIN 
        Partner p ON p.id = pe.partnerId 
      LEFT JOIN 
        Link l ON l.programId = pe.programId AND l.partnerId = pe.partnerId
      LEFT JOIN
        Commission c ON c.linkId = l.id
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
        earnings: Number(partner.totalEarnings),
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
    const {
      programId,
      name,
      email,
      username,
      image,
      country,
      description,
      tenantId,
      linkProps,
    } = createPartnerSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You need to set a domain and url for this program before creating a partner.",
      });
    }

    const { link, error, code } = await processLink({
      payload: {
        ...linkProps,
        domain: program.domain,
        key: username,
        url: program.url,
        programId,
        tenantId,
        folderId: program.defaultFolderId,
        trackConversion: true,
      },
      workspace,
      userId: session.user.id,
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const partnerLink = await createLink(link);

    waitUntil(
      sendWorkspaceWebhook({
        trigger: "link.created",
        workspace,
        data: linkEventSchema.parse(partnerLink),
      }),
    );

    const partner = await enrollPartner({
      program,
      tenantId,
      link: partnerLink,
      workspace,
      partner: {
        name,
        email,
        image,
        country,
        description,
      },
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
