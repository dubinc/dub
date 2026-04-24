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
    country: z.string().optional(),
  });

// GET /api/commissions/top-partners
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
    start,
    end,
    interval,
    timezone,
    status,
    partnerId,
    groupId,
    type,
    country,
  } = querySchema.parse(searchParams);

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
  const countryFilter = parseFilterValue(country);

  const rawTypeFilter = parseFilterValue(type);
  const validCommissionTypes = new Set(Object.values(CommissionType));
  const typeFilter =
    rawTypeFilter &&
    rawTypeFilter.values.some((v) =>
      validCommissionTypes.has(v as CommissionType),
    )
      ? {
          ...rawTypeFilter,
          values: rawTypeFilter.values.filter((v) =>
            validCommissionTypes.has(v as CommissionType),
          ) as CommissionType[],
        }
      : null;

  const grouped = await prisma.commission.groupBy({
    by: ["partnerId"],
    where: {
      programId,
      createdAt: { gte: startDate, lt: endDate },
      status: status
        ? status
        : {
            in: [
              CommissionStatus.pending,
              CommissionStatus.processed,
              CommissionStatus.paid,
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
      ...(countryFilter && {
        customer: {
          country:
            countryFilter.sqlOperator === "NOT IN"
              ? { notIn: countryFilter.values }
              : { in: countryFilter.values },
        },
      }),
    },
    _sum: { earnings: true },
    _count: { _all: true },
    orderBy: { _sum: { earnings: "desc" } },
    // Return up to 100 — client paginates
    take: 100,
  });

  if (grouped.length === 0) return NextResponse.json([]);

  const partnerIds = grouped.map((g) => g.partnerId);

  const [partners, enrollments] = await Promise.all([
    prisma.partner.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, image: true, country: true },
    }),
    prisma.programEnrollment.findMany({
      where: { programId, partnerId: { in: partnerIds } },
      select: {
        partnerId: true,
        groupId: true,
        partnerGroup: { select: { name: true } },
      },
    }),
  ]);

  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const enrollmentMap = new Map(enrollments.map((e) => [e.partnerId, e]));

  const result = grouped.map((g) => {
    const partner = partnerMap.get(g.partnerId);
    const enrollment = enrollmentMap.get(g.partnerId);
    return {
      partnerId: g.partnerId,
      name: partner?.name ?? "",
      image: partner?.image ?? null,
      country: partner?.country ?? null,
      groupId: enrollment?.groupId ?? null,
      groupName: enrollment?.partnerGroup?.name ?? null,
      earnings: g._sum.earnings ?? 0,
      commissionCount: g._count._all,
    };
  });

  return NextResponse.json(result);
});
