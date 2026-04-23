import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { getPartnersQuerySchemaExtended } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { toCentsNumber } from "@dub/utils";
import * as z from "zod/v4";
import { buildProgramEnrollmentWhereForList } from "./program-enrollment-query";

type PartnerFilters = z.infer<typeof getPartnersQuerySchemaExtended> & {
  programId: string;
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
          platforms: true,
        },
      },
      links: true,
      discoveredPartner: {
        select: {
          invitedAt: true,
        },
      },
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return partners.map(
    ({ partner, links, discoveredPartner, ...programEnrollment }) => ({
      ...partner,
      ...programEnrollment,
      id: partner.id,
      email:
        programEnrollment.status === "invited" &&
        discoveredPartner?.invitedAt != null
          ? obfuscateCustomerEmail(partner.email ?? "")
          : partner.email,
      createdAt: new Date(programEnrollment.createdAt),
      links,
      netRevenue:
        toCentsNumber(programEnrollment.totalSaleAmount ?? 0) -
        toCentsNumber(programEnrollment.totalCommissions ?? 0),
    }),
  );
}
