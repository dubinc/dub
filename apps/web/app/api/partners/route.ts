import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/planetscale";
import { conn } from "@/lib/planetscale/connection";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
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

    const { status, country, search, ids, page, pageSize, sortBy, sortOrder } =
      partnersQuerySchema.parse(searchParams);

    const partners = await (async () => {
      if (sortBy === "earnings" || sortBy === "clicks" || sortBy === "sales") {
        const { rows } = await conn.execute(
          `SELECT 
            p.*,
            pe.id as enrollmentId,
            pe.status,
            pe.programId,
            pe.partnerId,
            pe.createdAt as enrollmentCreatedAt,
            COALESCE(SUM(l.saleAmount), 0) as totalSaleAmount,
            COALESCE(SUM(l.clicks), 0) as totalClicks,
            COALESCE(SUM(l.sales), 0) as totalSales
          FROM Partner p
          INNER JOIN ProgramEnrollment pe ON p.id = pe.partnerId
          LEFT JOIN Link l ON pe.tenantId = l.tenantId AND pe.programId = l.programId
          WHERE pe.programId = ?
            AND (CASE 
              WHEN ? IS NOT NULL THEN pe.status = ?
              ELSE pe.status != 'rejected'
            END)
            AND (CASE 
              WHEN ? IS NOT NULL THEN p.country = ?
              ELSE TRUE
            END)
            AND (CASE 
              WHEN ? IS NOT NULL THEN p.name LIKE CONCAT('%', ?, '%')
              ELSE TRUE
            END)
          GROUP BY pe.id, p.id
          ORDER BY 
            CASE 
              WHEN ? = 'earnings' AND ? = 'asc' THEN totalSaleAmount
            END ASC,
            CASE 
              WHEN ? = 'earnings' AND ? = 'desc' THEN totalSaleAmount
            END DESC,
            CASE 
              WHEN ? = 'clicks' AND ? = 'asc' THEN totalClicks
            END ASC,
            CASE 
              WHEN ? = 'clicks' AND ? = 'desc' THEN totalClicks
            END DESC,
            CASE 
              WHEN ? = 'sales' AND ? = 'asc' THEN totalSales
            END ASC,
            CASE 
              WHEN ? = 'sales' AND ? = 'desc' THEN totalSales
            END DESC
          LIMIT ?
          OFFSET ?`,
          [
            programId,
            status,
            status,
            country,
            country,
            search,
            search,
            sortBy,
            sortOrder,
            sortBy,
            sortOrder,
            sortBy,
            sortOrder,
            sortBy,
            sortOrder,
            sortBy,
            sortOrder,
            sortBy,
            sortOrder,
            pageSize,
            (page - 1) * pageSize,
          ],
        );

        return (rows as any[]).map((row) => ({
          id: row.partnerId,
          name: row.name,
          email: row.email,
          image: row.image,
          country: row.country,
          status: row.status,
          programId: row.programId,
          createdAt: row.enrollmentCreatedAt,
          earnings:
            ((program.commissionType === "percentage"
              ? Number(row.totalSaleAmount)
              : Number(row.totalSales)) ?? 0) *
            (program.commissionAmount / 100),
        }));
      }

      // Original query for non-link related sorting
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          status: status || { not: "rejected" },
          ...(country && { partner: { country } }),
          ...(search && { partner: { name: { contains: search } } }),
          ...(ids && {
            partnerId: {
              in: ids,
            },
          }),
        },
        include: {
          partner: true,
          links: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      });

      return programEnrollments.map((enrollment) => ({
        ...enrollment.partner,
        ...enrollment,
        id: enrollment.partnerId,
        earnings:
          ((program.commissionType === "percentage"
            ? enrollment.links.reduce((acc, link) => acc + link.saleAmount, 0)
            : enrollment.links.reduce((acc, link) => acc + link.sales, 0)) ??
            0) *
          (program.commissionAmount / 100),
      }));
    })();

    console.log({ partners });

    return NextResponse.json(z.array(EnrolledPartnerSchema).parse(partners));
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
    const { programId, name, email, image, username, linkProps } =
      createPartnerSchema.parse(await parseRequestBody(req));

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

    const linkExists = await checkIfKeyExists(program.domain, username);

    if (linkExists) {
      throw new DubApiError({
        code: "conflict",
        message: "This username is already in use. Choose a different one.",
      });
    }

    const { link, error, code } = await processLink({
      payload: {
        ...linkProps,
        domain: program.domain,
        url: program.url,
        key: username,
        programId,
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

    const createdPartner = await enrollPartner({
      programId,
      linkId: partnerLink.id,
      partner: {
        name,
        email,
        image,
      },
    });

    const partner = EnrolledPartnerSchema.parse({
      ...createdPartner,
      link: partnerLink,
      status: "approved",
      commissionAmount: null,
      earnings: 0,
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
