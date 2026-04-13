import { withAdmin } from "@/lib/auth";
import { fraudAlertSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudAlertStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const PAGE_SIZE = 50;

const querySchema = z.object({
  status: z.enum(FraudAlertStatus).optional(),
  programId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
});

// GET /api/admin/fraud-alerts
export const GET = withAdmin(async ({ searchParams }) => {
  const { status, programId, page } = querySchema.parse(searchParams);

  const where = {
    ...(status && { status }),
    ...(programId && { programId }),
  };

  const skip = (page - 1) * PAGE_SIZE;

  const [fraudAlerts, total] = await Promise.all([
    prisma.fraudAlert.findMany({
      where,
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        partnerId: true,
        reason: true,
        status: true,
        reviewedAt: true,
        reviewNote: true,
        createdAt: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.fraudAlert.count({ where }),
  ]);

  return NextResponse.json({
    fraudAlerts: fraudAlertSchema.array().parse(fraudAlerts),
    total,
  });
});
