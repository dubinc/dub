import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { buildPaginationQuery } from "@/lib/api/pagination";
import { generateRandomName } from "@/lib/names";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import { prisma } from "@/lib/prisma";
import {
  getPartnerEarningsQuerySchema,
  PartnerProfileEarningsSchema,
} from "@/lib/zod/schemas/partner-profile";
import { CommissionType, Partner } from "@prisma/client";
import * as z from "zod/v4";
import { getPartnerEarningsWhere } from "./get-partner-earnings-where";
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
    page,
    pageSize,
    startingAfter,
    endingBefore,
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

  // the helper sorts cursor pages by ID only, so the sort below replaces its orderBy
  const { orderBy: _, ...paginationQuery } = buildPaginationQuery({
    page,
    pageSize,
    startingAfter,
    endingBefore,
    sortBy,
    sortOrder,
  });

  const where = getPartnerEarningsWhere({
    partnerId,
    programId,
    startDate,
    endDate,
    type,
    status,
    linkId,
    customerId,
    payoutId,
  });

  // the cursor must match the same filters, because Prisma skips the first row after the cursor position
  // and would drop a valid earning when the cursor itself is not in the results
  const cursorId = startingAfter || endingBefore;

  if (cursorId) {
    const cursor = await prisma.commission.findFirst({
      where: {
        ...where,
        id: cursorId,
      },
      select: {
        id: true,
      },
    });

    if (!cursor) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message:
          "Invalid cursor: the provided ID does not exist or does not match the filters.",
      });
    }
  }

  const earnings = await prisma.commission.findMany({
    where,
    // the response schema drops these fields, so don't load them
    omit: {
      metadata: true,
      userId: true,
      invoiceId: true,
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
          partnerGroup: {
            select: {
              revenueDataSharingDisabledAt: true,
            },
          },
        },
      },
    },
    ...paginationQuery,
    // offset and cursor pages use the same sort, and the commission ID breaks ties, so that no earning repeats or goes missing between pages
    orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
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

      const earning = {
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

      return isPartnerRevenueHidden(programEnrollment.partnerGroup)
        ? { ...earning, amount: null }
        : earning;
    }),
  );
}
