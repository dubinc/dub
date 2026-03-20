import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  buildMetricRangeWhere,
  buildProgramEnrollmentWhereForList,
  percentileBreakpoints,
} from "./program-enrollment-query";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
): Promise<T> {
  const { groupBy, metric, programId, ...enrollmentFilters } = filters;
  const enrollmentBase = { ...enrollmentFilters, programId };

  const { status, country, search, email, partnerIds, groupId } =
    enrollmentFilters;

  const commonWhere: Prisma.PartnerWhereInput = {
    ...(email
      ? { email }
      : search
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
              companyName: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
  };

  const enrollmentMetricWhere = buildMetricRangeWhere(enrollmentBase);

  if (groupBy === "metricPercentiles") {
    const m = metric!;
    const where = buildProgramEnrollmentWhereForList(enrollmentBase, {
      percentileMetric: m,
    });

    if (m === "totalClicks") {
      const rows = await prisma.programEnrollment.findMany({
        where,
        select: { totalClicks: true },
        orderBy: { totalClicks: "asc" },
      });
      return {
        percentiles: percentileBreakpoints(rows.map((r) => r.totalClicks)),
      } as T;
    }
    if (m === "totalLeads") {
      const rows = await prisma.programEnrollment.findMany({
        where,
        select: { totalLeads: true },
        orderBy: { totalLeads: "asc" },
      });
      return {
        percentiles: percentileBreakpoints(rows.map((r) => r.totalLeads)),
      } as T;
    }
    if (m === "totalConversions") {
      const rows = await prisma.programEnrollment.findMany({
        where,
        select: { totalConversions: true },
        orderBy: { totalConversions: "asc" },
      });
      return {
        percentiles: percentileBreakpoints(rows.map((r) => r.totalConversions)),
      } as T;
    }
    const rows = await prisma.programEnrollment.findMany({
      where,
      select: { totalCommissions: true },
      orderBy: { totalCommissions: "asc" },
    });
    return {
      percentiles: percentileBreakpoints(
        rows.map((r) => Number(r.totalCommissions)),
      ),
    } as T;
  }

  // Get partner count by country
  if (groupBy === "country") {
    const partners = await prisma.partner.groupBy({
      by: ["country"],
      where: {
        programs: {
          some: {
            programId,
            ...(groupId && {
              groupId,
            }),
            status,
            ...enrollmentMetricWhere,
          },
        },
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });

    return partners as T;
  }

  // Get partner count by status
  if (groupBy === "status") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["status"],
      where: {
        programId,
        ...(groupId && {
          groupId,
        }),
        partner: {
          ...(country && {
            country,
          }),
          ...commonWhere,
        },
        ...enrollmentMetricWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          status: "desc",
        },
      },
    });

    // Find missing statuses
    const missingStatuses = Object.values(ProgramEnrollmentStatus).filter(
      (st) => !partners.some((p) => p.status === st),
    );

    // Add missing statuses with count 0
    missingStatuses.forEach((st) => {
      partners.push({ _count: 0, status: st });
    });

    return partners as T;
  }

  // Get partner count by group
  if (groupBy === "groupId") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["groupId"],
      where: {
        programId,
        partner: {
          ...(country && {
            country,
          }),
          ...commonWhere,
        },
        status,
        ...enrollmentMetricWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          groupId: "desc",
        },
      },
    });

    return partners as T;
  }

  // Get absolute count of partners
  const count = await prisma.programEnrollment.count({
    where: buildProgramEnrollmentWhereForList(enrollmentBase),
  });

  return count as T;
}
