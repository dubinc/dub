import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import type { CommissionsBreakdownItem } from "@/lib/swr/use-commissions-breakdown";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType } from "@dub/prisma/client";
import { capitalize, COUNTRIES, parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = analyticsQuerySchema
  .pick({ start: true, end: true, interval: true, timezone: true })
  .extend({
    groupBy: z.enum(["type", "group", "country", "customer"]),
    status: z.enum(CommissionStatus).optional(),
    partnerId: z.string().optional(),
    groupId: z.string().optional(),
    type: z.string().optional(),
    country: z.string().optional(),
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
  const typeFilter = parseFilterValue(type);
  const countryFilter = parseFilterValue(country);

  const baseWhere = {
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
          ? { notIn: typeFilter.values as CommissionType[] }
          : { in: typeFilter.values as CommissionType[] },
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
  } else if (groupBy === "group") {
    const commissions = await prisma.commission.findMany({
      where: baseWhere,
      select: {
        earnings: true,
        programEnrollment: {
          select: {
            groupId: true,
            partnerGroup: { select: { name: true } },
          },
        },
      },
    });

    const map = new Map<
      string,
      { label: string; earnings: number; count: number }
    >();
    for (const c of commissions) {
      const key = c.programEnrollment.groupId ?? "ungrouped";
      const label = c.programEnrollment.partnerGroup?.name ?? "Ungrouped";
      const entry = map.get(key) ?? { label, earnings: 0, count: 0 };
      entry.earnings += c.earnings;
      entry.count++;
      map.set(key, entry);
    }

    result = Array.from(map.entries())
      .map(([key, { label, earnings, count }]) => ({
        key,
        label,
        earnings,
        count,
      }))
      .sort((a, b) => b.earnings - a.earnings);
  } else if (groupBy === "country") {
    const commissions = await prisma.commission.findMany({
      where: baseWhere,
      select: {
        earnings: true,
        customer: { select: { country: true } },
      },
    });

    const map = new Map<string, { earnings: number; count: number }>();
    for (const c of commissions) {
      const key = c.customer?.country ?? "unknown";
      const entry = map.get(key) ?? { earnings: 0, count: 0 };
      entry.earnings += c.earnings;
      entry.count++;
      map.set(key, entry);
    }

    result = Array.from(map.entries())
      .map(([key, { earnings, count }]) => ({
        key,
        label: (key !== "unknown" ? COUNTRIES[key] : null) ?? key,
        earnings,
        count,
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 20);
  } else if (groupBy === "customer") {
    const rows = await prisma.commission.groupBy({
      by: ["customerId"],
      where: { ...baseWhere, customerId: { not: null } },
      _sum: { earnings: true },
      _count: { _all: true },
      orderBy: { _sum: { earnings: "desc" } },
      take: 20,
    });

    if (rows.length === 0) return NextResponse.json([]);

    const customerIds = rows.map((r) => r.customerId!);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    result = rows.map((r) => {
      const customer = r.customerId ? customerMap.get(r.customerId) : null;
      return {
        key: r.customerId ?? "unknown",
        label: customer?.email ?? customer?.name ?? r.customerId ?? "Unknown",
        earnings: r._sum.earnings ?? 0,
        count: r._count._all,
      };
    });
  }

  return NextResponse.json(result);
});
