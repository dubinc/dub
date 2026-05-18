import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { generateRandomName } from "@/lib/names";
import {
  getPartnerEarningsQuerySchema,
  PartnerEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { CommissionType, Partner } from "@dub/prisma/client";
import * as z from "zod/v4";
import { obfuscateCustomerEmail } from "./obfuscate-customer-email";

interface GetEarningsForPartnerParams
  extends z.infer<typeof getPartnerEarningsQuerySchema> {
  programId: string;
  partnerId: string;
  customerDataSharingEnabledAt: Date | null;
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
    customerDataSharingEnabledAt,
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
      programId,
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

  return z.array(PartnerEarningsSchema).parse(
    earnings.map((e) => {
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
              email: customerDataSharingEnabledAt
                ? customerEmail
                : obfuscateCustomerEmail(customerEmail),
              country: e.customer?.country,
            }
          : null,
      };
    }),
  );
}
