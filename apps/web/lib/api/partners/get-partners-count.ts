import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { z } from "zod";

type PartnersCountFilters = z.infer<typeof partnersCountQuerySchema> & {
  programId: string;
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
    groupId,
    programId,
  } = filters;

  const commonWhere: Prisma.PartnerWhereInput = {
    ...(email
      ? { email }
      : search
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
  };

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
          },
          every: {
            status,
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
        partner: {
          ...(country && {
            country,
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

  // Get absolute count of partners
  const count = await prisma.programEnrollment.count({
    where: {
      programId,
      status,
      ...(groupId && {
        groupId,
      }),
      partner: {
        ...(country && {
          country,
        }),
        ...commonWhere,
      },
    },
  });

  return count as T;
}
