import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType } from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = analyticsQuerySchema
  .pick({ start: true, end: true, interval: true, timezone: true })
  .extend({
    status: z.enum(CommissionStatus).optional(),
    partnerId: z.string().optional(),
    groupId: z.string().optional(),
    type: z.string().optional(),
  });

// GET /api/commissions/top-partners
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { start, end, interval, timezone, status, partnerId, groupId, type } =
    querySchema.parse(searchParams);

  assertValidDateRangeForPlan({
    plan: workspace.plan,
    dataAvailableFrom: workspace.createdAt,
    interval,
    start,
    end,
  });

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const groupFilter = parseFilterValue(groupId);

  const rawTypeFilter = parseFilterValue(type);
  const validCommissionTypes = new Set(Object.values(CommissionType));

  const validTypeValues = rawTypeFilter
    ? (rawTypeFilter.values.filter((v) =>
        validCommissionTypes.has(v as CommissionType),
      ) as CommissionType[])
    : [];

  if (
    rawTypeFilter?.sqlOperator === "IN" &&
    rawTypeFilter.values.length > 0 &&
    validTypeValues.length === 0
  ) {
    return NextResponse.json([]);
  }

  const typeFilter =
    rawTypeFilter && validTypeValues.length > 0
      ? { ...rawTypeFilter, values: validTypeValues }
      : null;

  const grouped = await prisma.commission.groupBy({
    by: ["partnerId"],
    where: {
      programId,
      createdAt: { gte: startDate, lt: endDate },
      status: status
        ? status
        : {
            notIn: [
              CommissionStatus.duplicate,
              CommissionStatus.fraud,
              CommissionStatus.canceled,
            ],
          },
      ...(partnerFilter && {
        partnerId:
          partnerFilter.sqlOperator === "NOT IN"
            ? { notIn: partnerFilter.values }
            : { in: partnerFilter.values },
      }),
      ...(typeFilter && {
        type:
          typeFilter.sqlOperator === "NOT IN"
            ? { notIn: typeFilter.values }
            : { in: typeFilter.values },
      }),
      ...(groupFilter && {
        programEnrollment: {
          groupId:
            groupFilter.sqlOperator === "NOT IN"
              ? { notIn: groupFilter.values }
              : { in: groupFilter.values },
        },
      }),
    },
    _sum: { earnings: true },
    _count: { _all: true },
    orderBy: { _sum: { earnings: "desc" } },
    take: 100,
  });

  if (grouped.length === 0) return NextResponse.json([]);

  const partnerIds = grouped.map((g) => g.partnerId);

  const partners = await prisma.partner.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true, image: true, country: true },
  });

  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  const result = grouped.flatMap((g) => {
    const partner = partnerMap.get(g.partnerId);
    if (!partner) return [];

    return [
      {
        partnerId: g.partnerId,
        name: partner.name,
        image: partner.image ?? null,
        country: partner.country ?? null,
        earnings: g._sum.earnings ?? 0,
        commissionCount: g._count._all,
      },
    ];
  });

  return NextResponse.json(result);
});
