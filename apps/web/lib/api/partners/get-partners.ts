import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { toCentsNumber } from "@dub/utils";
import * as z from "zod/v4";
import {
  buildProgramEnrollmentWhereForList,
  type PartnerEnrollmentQueryFilters,
} from "./program-enrollment-query";

type PartnerFilters = PartnerEnrollmentQueryFilters & {
  sortBy: z.infer<typeof getPartnersQuerySchemaExtended>["sortBy"];
  sortOrder: z.infer<typeof getPartnersQuerySchemaExtended>["sortOrder"];
  page?: number;
  pageSize: z.infer<typeof getPartnersQuerySchemaExtended>["pageSize"];
  includePartnerPlatforms?: boolean;
};

export async function getPartners(filters: PartnerFilters) {
  const {
    page = 1,
    pageSize,
    sortBy,
    sortOrder,
    programId,
    includePartnerPlatforms: _includePartnerPlatforms,
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
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return partners.map(({ partner, links, ...programEnrollment }) => ({
    ...partner,
    ...programEnrollment,
    id: partner.id,
    createdAt: new Date(programEnrollment.createdAt),
    tags: partner.programPartnerTags
      .map(({ partnerTag }) => partnerTag)
      .filter((t) => t.programId != null && t.programId === programId),
    links,
    netRevenue:
      toCentsNumber(programEnrollment.totalSaleAmount ?? 0) -
      toCentsNumber(programEnrollment.totalCommissions ?? 0),
  }));
}
