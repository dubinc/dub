import { partnersCountQuerySchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramEnrollmentStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  buildEnrollmentStatusWhere,
  buildMetricRangeWhere,
  buildNullableStringListWhere,
  buildPartnerEmailSearchWhere,
  buildProgramEnrollmentWhereForList,
  mergePartnerCountryAndSearchWhere,
  type PartnerEnrollmentQueryFilters,
} from "./program-enrollment-query";

type PartnersCountFilters = PartnerEnrollmentQueryFilters & {
  groupBy?: z.infer<typeof partnersCountQuerySchema>["groupBy"];
};

export async function getPartnersCount<T>(
  filters: PartnersCountFilters,
): Promise<T> {
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
    tenantId,
    partnerTagIdOperator = "IN",
    groupIdOperator = "IN",
    countryOperator = "IN",
    statusOperator = "IN",
  } = enrollmentFilters;

  const statusWhere = buildEnrollmentStatusWhere(status, statusOperator);

  const enrollmentScope: Prisma.ProgramEnrollmentWhereInput = {
    programId,
    ...(tenantId ? { tenantId } : {}),
  };

  const partnerTagIdNotIn = partnerTagIdOperator === "NOT IN";
  const groupIdNotIn = groupIdOperator === "NOT IN";
  const countryNotIn = countryOperator === "NOT IN";

  const groupIdWhere = buildNullableStringListWhere(
    "groupId",
    groupId,
    groupIdNotIn,
  );
  const countryWhere = buildNullableStringListWhere(
    "country",
    country,
    countryNotIn,
  );

  const emailSearchWhere = buildPartnerEmailSearchWhere({ email, search });
  const partnerTagFilter = partnerTagId
    ? {
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
      }
    : undefined;

  const commonWhere: Prisma.PartnerWhereInput = {
    ...emailSearchWhere,
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(partnerTagFilter ?? {}),
  };

  const partnerWhereWithCountry: Prisma.PartnerWhereInput = {
    ...mergePartnerCountryAndSearchWhere(countryWhere, emailSearchWhere),
    ...(partnerIds && {
      id: { in: partnerIds },
    }),
    ...(partnerTagFilter ?? {}),
  };

  const enrollmentMetricWhere = buildMetricRangeWhere(enrollmentBase);

  if (groupBy === "country") {
    const partners = await prisma.partner.groupBy({
      by: ["country"],
      where: {
        programs: {
          some: {
            ...enrollmentScope,
            ...(groupIdWhere ?? {}),
            ...(statusWhere !== undefined ? { status: statusWhere } : {}),
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

  if (groupBy === "status") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["status"],
      where: {
        ...enrollmentScope,
        ...(groupIdWhere ?? {}),
        ...(statusWhere !== undefined ? { status: statusWhere } : {}),
        partner: partnerWhereWithCountry,
        ...enrollmentMetricWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          status: "desc",
        },
      },
    });

    // Only pad missing enum values when no status filter is active
    if (statusWhere === undefined) {
      const missingStatuses = Object.values(ProgramEnrollmentStatus).filter(
        (status) => !partners.some((p) => p.status === status),
      );

      missingStatuses.forEach((status) => {
        partners.push({ _count: 0, status: status });
      });
    }

    return partners as T;
  }

  if (groupBy === "groupId") {
    const partners = await prisma.programEnrollment.groupBy({
      by: ["groupId"],
      where: {
        ...enrollmentScope,
        partner: partnerWhereWithCountry,
        ...(statusWhere !== undefined ? { status: statusWhere } : {}),
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
    const enrollmentWhere = buildProgramEnrollmentWhereForList({
      ...enrollmentBase,
      partnerTagId: undefined,
    });

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

  if (groupBy === "referredByPartnerId") {
    const results = await prisma.programApplicationEvent.groupBy({
      by: ["referredByPartnerId"],
      where: {
        programId,
        referredByPartnerId: {
          not: null,
        },
        programEnrollment: {
          ...enrollmentScope,
          ...(groupIdWhere ?? {}),
          ...(statusWhere !== undefined ? { status: statusWhere } : {}),
          partner: partnerWhereWithCountry,
          ...enrollmentMetricWhere,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          referredByPartnerId: "desc",
        },
      },
    });

    return results.map((row) => ({
      referredByPartnerId: row.referredByPartnerId,
      _count: row._count,
    })) as T;
  }

  // Get absolute count of partners
  const count = await prisma.programEnrollment.count({
    where: buildProgramEnrollmentWhereForList(enrollmentBase),
  });

  return count as T;
}
