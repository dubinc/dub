import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { generateRandomName } from "@/lib/names";
import {
  getPartnerEarningsQuerySchema,
  PartnerEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
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
      customer: true,
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

  return z.array(PartnerEarningsSchema).parse(
    earnings.map((e) => {
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
