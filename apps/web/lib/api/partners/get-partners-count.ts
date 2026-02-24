import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import * as z from "zod/v4";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
  partnerTagIdsOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
): Promise<T> {
  const {
    groupBy,
    status,
    country,
    search,
    email,
    partnerIds,
    partnerTagIds,
    groupId,
    programId,
    partnerTagIdsOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
  } = filters;

  const partnerTagIdsNotIn = partnerTagIdsOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

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
    ...(partnerTagIds && {
      programPartnerTags: {
        ...(partnerTagIdsNotIn
          ? {
              none: {
                programId,
                partnerTagId: { in: partnerTagIds },
              },
            }
          : {
              some: {
                programId,
                partnerTagId: { in: partnerTagIds },
              },
            }),
      },
    }),
  };

  const programsWhere = {
    some: {
      programId,
      ...(groupId && !groupIdNotIn && { groupId }),
    },
    every: { status },
    ...(groupId && groupIdNotIn && { none: { groupId } }),
  };

  // Get partner count by country
  if (groupBy === "country") {
    const partners = await prisma.partner.groupBy({
      by: ["country"],
      where: {
        programs: programsWhere,
        ...(country && {
          country: countryNotIn ? { not: country } : country,
        }),
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
        ...(groupId &&
          (groupIdNotIn ? { groupId: { not: groupId } } : { groupId })),
        partner: {
          ...(country && {
            country: countryNotIn ? { not: country } : country,
          }),
          ...commonWhere,
        },
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
      partners.push({ _count: 0, status });
    });

    return partners as T;
  }

  // Get partner count by group
  if (groupBy === "groupId") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["groupId"],
      where: {
        programId,
        ...(groupId &&
          groupIdNotIn && {
            groupId: { not: groupId },
          }),
        partner: {
          ...(country && {
            country: countryNotIn ? { not: country } : country,
          }),
          ...commonWhere,
        },
        status,
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
    const partners = await prisma.programPartnerTag.groupBy({
      by: ["partnerTagId"],
      where: {
        programId,
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
    where: {
      programId,
      status,
      ...(groupId &&
        (groupIdNotIn ? { groupId: { not: groupId } } : { groupId })),
      partner: {
        ...(country && {
          country: countryNotIn ? { not: country } : country,
        }),
        ...commonWhere,
      },
    },
  });

  return count as T;
}
