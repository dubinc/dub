import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import {
  getPartnerEarningsQuerySchema,
  PartnerProfileEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { CommissionType, Partner } from "@prisma/client";
import * as z from "zod/v4";
import { getEarningsProgramFilter } from "./get-earnings-program-id";
import { obfuscateCustomerEmail } from "./obfuscate-customer-email";

interface GetEarningsForPartnerParams
  extends z.infer<typeof getPartnerEarningsQuerySchema> {
  partnerId: string;
  programId?: string; // if not provided, earnings across all programs (except the network program) are returned
}

export async function getEarningsForPartner(
  params: GetEarningsForPartnerParams,
) {
  const {
    page = 1,
    pageSize,
    type,
    status,
    sortBy,
    sortOrder,
    linkId,
    customerId,
    payoutId,
    interval,
    start,
    end,
    timezone,
    programId,
    partnerId,
  } = params;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const earnings = await prisma.commission.findMany({
    where: {
      earnings: {
        not: 0,
      },
      programId: getEarningsProgramFilter(programId),
      partnerId,
      status,
      type,
      linkId,
      customerId,
      payoutId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
        },
      },
      link: {
        select: {
          id: true,
          shortLink: true,
          url: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      programEnrollment: {
        select: {
          customerDataSharingEnabledAt: true,
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  // TODO: Once we migrate to add sourcePartner relation on Commission table, we can simplify this logic
  let sourcePartners: Pick<Partner, "id" | "name" | "email" | "country">[] = [];
  const commissionsWithSourcePartnerIds = earnings.filter(
    (e) => e.type === CommissionType.referral && e.sourcePartnerId,
  );
  if (commissionsWithSourcePartnerIds.length > 0) {
    sourcePartners = await prisma.partner.findMany({
      where: {
        id: {
          in: commissionsWithSourcePartnerIds.map((e) => e.sourcePartnerId!),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
      },
    });
  }

  return z.array(PartnerProfileEarningsSchema).parse(
    earnings.map(({ programEnrollment, ...e }) => {
      if (e.type === CommissionType.referral && e.sourcePartnerId) {
        const sourcePartner = sourcePartners.find(
          (p) => p.id === e.sourcePartnerId,
        );
        if (sourcePartner) {
          e.customer = sourcePartner;
        }
      }

      // fallback to a random name if the customer doesn't have an email
      const customerEmail =
        e.customer?.email || e.customer?.name || generateRandomName();

      return {
        ...e,
        customer: e.customer
          ? {
              ...e.customer,
              email: programEnrollment.customerDataSharingEnabledAt
                ? customerEmail
                : obfuscateCustomerEmail(customerEmail),
              country: e.customer?.country,
            }
          : null,
      };
    }),
  );
}
