import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  buildMetricRangeWhere,
  buildPartnerEmailSearchWhere,
  buildProgramEnrollmentWhereForList,
} from "./program-enrollment-query";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
): Promise<T> {
  const { groupBy, programId, ...enrollmentFilters } = filters;
  const enrollmentBase = { ...enrollmentFilters, programId };

  const { status, country, search, email, partnerIds, groupId } =
    enrollmentFilters;

  const commonWhere: Prisma.PartnerWhereInput = {
    ...buildPartnerEmailSearchWhere({ email, search }),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
  };

  const enrollmentMetricWhere = buildMetricRangeWhere(enrollmentBase);

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
            status:
              status === "approved_invited"
                ? {
                    in: ["approved", "invited"],
                  }
                : status,
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
      (status) => !partners.some((p) => p.status === status),
    );

    // Add missing statuses with count 0
    missingStatuses.forEach((status) => {
      partners.push({ _count: 0, status: status });
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
        status:
          status === "approved_invited"
            ? {
                in: ["approved", "invited"],
              }
            : status,
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
