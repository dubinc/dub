import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  buildMetricRangeWhere,
  buildPartnerEmailSearchWhere,
  buildProgramEnrollmentWhereForList,
  buildStringOrListFieldFilter,
} from "./program-enrollment-query";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
): Promise<T> {
  // const {

  const { groupBy, programId, ...enrollmentFilters } = filters;
  const enrollmentBase = { ...enrollmentFilters, programId };

  const {
    status,
    country,
    search,
    email,
    partnerIds,
    groupId,
    partnerTagId,
    partnerTagIdOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = enrollmentFilters;

  const partnerTagIdNotIn = partnerTagIdOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

  const groupIdFilter = buildStringOrListFieldFilter(groupId, groupIdNotIn);
  const countryFilter = buildStringOrListFieldFilter(country, countryNotIn);

  const commonWhere: Prisma.PartnerWhereInput = {
    ...buildPartnerEmailSearchWhere({ email, search }),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(partnerTagId && {
      programPartnerTags: {
        ...(partnerTagIdNotIn
          ? {
              none: {
                programId,
                partnerTagId: { in: partnerTagId },
              },
            }
          : {
              some: {
                programId,
                partnerTagId: { in: partnerTagId },
              },
            }),
      },
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
            ...(groupIdFilter !== undefined && {
              groupId: groupIdFilter,
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
        ...(groupIdFilter !== undefined && { groupId: groupIdFilter }),
        partner: {
          ...(countryFilter !== undefined && { country: countryFilter }),
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
        ...(groupIdFilter !== undefined && { groupId: groupIdFilter }),
        partner: {
          ...(countryFilter !== undefined && { country: countryFilter }),
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

  if (groupBy === "partnerTagId") {
    const enrollmentWhere = buildProgramEnrollmentWhereForList(enrollmentBase);

    const partners = await prisma.programPartnerTag.groupBy({
      by: ["partnerTagId"],
      where: {
        programId,
        programEnrollment: enrollmentWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          partnerTagId: "desc",
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
