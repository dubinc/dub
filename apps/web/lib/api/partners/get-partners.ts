import { prisma } from "@/lib/prisma";
import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { toCentsNumber } from "@dub/utils";
import * as z from "zod/v4";
import { buildProgramEnrollmentWhereForList } from "./program-enrollment-query";

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
  includeGroup?: boolean;
  partnerTagIdOperator?: "IN" | "NOT IN";
  groupIdOperator?: "IN" | "NOT IN";
  countryOperator?: "IN" | "NOT IN";
};

export async function getPartners(filters: PartnerFilters) {
  const {
    page = 1,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includePartnerPlatforms: _includePartnerPlatforms,
    includeGroup = false,
    ...enrollmentRest
  } = filters;

  const partners = await prisma.programEnrollment.findMany({
    where: buildProgramEnrollmentWhereForList({
      ...enrollmentRest,
      programId,
    }),
    include: {
      partner: {
        include: {
          programPartnerTags: {
            where: {
              programId,
            },
            include: {
              partnerTag: true,
            },
          },
          platforms: true,
        },
      },
      links: true,
      ...(includeGroup
        ? {
            partnerGroup: {
              select: {
                name: true,
              },
            },
          }
        : {}),
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return partners.map(
    ({ partner, links, partnerGroup, ...programEnrollment }) => ({
      ...partner,
      ...programEnrollment,
      id: partner.id,
      createdAt: new Date(programEnrollment.createdAt),
      ...(includeGroup && { group: partnerGroup }),
      tags: partner.programPartnerTags
        .map(({ partnerTag }) => partnerTag)
        .filter((t) => t.programId != null && t.programId === programId),
      links,
      netRevenue:
        toCentsNumber(programEnrollment.totalSaleAmount ?? 0) -
        toCentsNumber(programEnrollment.totalCommissions ?? 0),
    }),
  );
}
