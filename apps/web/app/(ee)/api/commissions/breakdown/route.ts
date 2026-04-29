import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import type { CommissionsBreakdownItem } from "@/lib/swr/use-commissions-breakdown";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType } from "@dub/prisma/client";
import { capitalize, parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = analyticsQuerySchema
  .pick({ start: true, end: true, interval: true, timezone: true })
  .extend({
    groupBy: z.enum(["type", "groupId"]),
    status: z.enum(CommissionStatus).optional(),
    partnerId: z.string().optional(),
    groupId: z.string().optional(),
    type: z.string().optional(),
  });

// GET /api/commissions/breakdown
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
    start,
    end,
    interval,
    timezone,
    groupBy,
    status,
    partnerId,
    groupId,
    type,
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

  const baseWhere = {
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
  };

  let result: CommissionsBreakdownItem[] = [];

  if (groupBy === "type") {
    const rows = await prisma.commission.groupBy({
      by: ["type"],
      where: baseWhere,
      _sum: { earnings: true },
      _count: { _all: true },
      orderBy: { _sum: { earnings: "desc" } },
    });

    result = rows
      .filter((r) => r.type !== null)
      .map((r) => ({
        key: r.type!,
        label: capitalize(r.type!) ?? r.type!,
        earnings: r._sum.earnings ?? 0,
        count: r._count._all,
      }));
  } else if (groupBy === "groupId") {
    const partnerEarnings = await prisma.commission.groupBy({
      by: ["partnerId"],
      where: baseWhere,
      _sum: { earnings: true },
      _count: { _all: true },
      orderBy: { _sum: { earnings: "desc" } },
    });

    if (partnerEarnings.length > 0) {
      const partnerIds = partnerEarnings.map((p) => p.partnerId);

      const enrollments = await prisma.programEnrollment.findMany({
        where: { programId, partnerId: { in: partnerIds } },
        select: {
          partnerId: true,
          groupId: true,
          partnerGroup: { select: { name: true } },
        },
      });

      const enrollmentMap = new Map(enrollments.map((e) => [e.partnerId, e]));

      const groupMap = new Map<
        string,
        { label: string; earnings: number; count: number }
      >();
      for (const p of partnerEarnings) {
        const enrollment = enrollmentMap.get(p.partnerId);
        const key = enrollment?.groupId ?? "ungrouped";
        const label = enrollment?.partnerGroup?.name ?? "Ungrouped";
        const entry = groupMap.get(key) ?? { label, earnings: 0, count: 0 };
        entry.earnings += p._sum.earnings ?? 0;
        entry.count += p._count._all;
        groupMap.set(key, entry);
      }

      result = Array.from(groupMap.entries())
        .map(([key, { label, earnings, count }]) => ({
          key,
          label,
          earnings,
          count,
        }))
        .sort((a, b) => b.earnings - a.earnings);
    }
  }

  return NextResponse.json(result);
});
