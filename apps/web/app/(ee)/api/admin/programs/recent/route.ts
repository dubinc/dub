import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  adminRecentProgramSchema,
  adminRecentProgramsQuerySchema,
} from "@/lib/zod/schemas/admin";
import { ACME_PROGRAM_ID, DEMO_PROGRAM_ID } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/admin/programs/recent
export const GET = withAdmin(async ({ searchParams }) => {
  const { page = 1, pageSize, plan } =
    adminRecentProgramsQuerySchema.parse(searchParams);

  const where = {
    id: {
      notIn: [ACME_PROGRAM_ID, DEMO_PROGRAM_ID],
    },
    deactivatedAt: null,
    NOT: {
      slug: {
        endsWith: "-staging",
      },
    },
    ...(plan && {
      workspace: {
        plan,
      },
    }),
  } satisfies Prisma.ProgramWhereInput;

  const { startDate, endDate } = getStartEndDates({ interval: "30d" });

  const [programs, total] = await Promise.all([
    prisma.program.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        url: true,
        createdAt: true,
        addedToMarketplaceAt: true,
        workspace: {
          select: {
            plan: true,
            planPeriod: true,
          },
        },
      },
    }),
    prisma.program.count({ where }),
  ]);

  const programIds = programs.map((program) => program.id);

  const [partnerCounts, commissionRows] =
    programIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.programEnrollment.groupBy({
            by: ["programId"],
            where: {
              programId: {
                in: programIds,
              },
              status: "approved",
            },
            _count: true,
          }),
          // Drive from the page's program IDs so MySQL uses
          // Commission(programId, status, createdAt) instead of scanning
          // 30d of all commissions via (createdAt, status, programId).
          prisma.$queryRaw<{ programId: string; earnings: bigint | number }[]>`
            SELECT
              c.programId,
              SUM(c.earnings) AS earnings
            FROM Program p
            STRAIGHT_JOIN Commission c ON c.programId = p.id
            WHERE p.id IN (${Prisma.join(programIds)})
              AND c.status IN ('pending', 'processed', 'paid')
              AND c.createdAt >= ${startDate}
              AND c.createdAt <= ${endDate}
            GROUP BY c.programId
          `,
        ]);

  const partnersByProgramId = new Map(
    partnerCounts.map((row) => [row.programId, row._count]),
  );
  const commissionsByProgramId = new Map(
    commissionRows.map((row) => [row.programId, Number(row.earnings ?? 0)]),
  );

  return NextResponse.json({
    programs: adminRecentProgramSchema.array().parse(
      programs.map(({ workspace, ...program }) => ({
        ...program,
        plan: workspace.plan,
        planPeriod: workspace.planPeriod,
        partners: partnersByProgramId.get(program.id) ?? 0,
        commissions: commissionsByProgramId.get(program.id) ?? 0,
      })),
    ),
    total,
  });
});
