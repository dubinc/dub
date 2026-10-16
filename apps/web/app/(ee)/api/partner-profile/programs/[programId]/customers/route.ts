import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS,
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { generateRandomName } from "@/lib/names";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import { prisma, sanitizeFullTextSearch } from "@/lib/prisma";
import {
  getPartnerCustomersQuerySchema,
  mapPartnerLinkDetails,
  PartnerProfileCustomerSchema,
} from "@/lib/zod/schemas/partner-profile";
import { toCentsNumber } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/:programId/customers – Get all customers for a partner program
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const {
      search,
      country,
      linkId,
      sortBy,
      sortOrder,
      page = 1,
      pageSize,
    } = getPartnerCustomersQuerySchema.parse(searchParams);

    const {
      program,
      totalCommissions,
      customerDataSharingEnabledAt,
      partnerGroup,
    } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
      include: {
        program: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
        partnerGroup: {
          select: {
            revenueDataSharingDisabledAt: true,
          },
        },
      },
    });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      toCentsNumber(totalCommissions) <
        LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    const ltvExcluded =
      CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS.includes(program.id) ||
      isPartnerRevenueHidden(partnerGroup);

    if (sortBy === "saleAmount" && ltvExcluded) {
      throw new DubApiError({
        code: "bad_request",
        message: "This feature is not available for your program.",
      });
    }

    // Get all customers with their first commission date in a single optimized query
    const customers = await prisma.customer.findMany({
      where: {
        partnerId: partner.id,
        programId: program.id,
        projectId: program.workspaceId,
        ...(country && { country }),
        ...(linkId && { linkId }),
        // Only allow search if customer data sharing is enabled
        ...(search && customerDataSharingEnabledAt
          ? search.includes("@")
            ? { email: search }
            : {
                email: { search: sanitizeFullTextSearch(search) },
                name: { search: sanitizeFullTextSearch(search) },
              }
          : {}),
      },
      include: {
        link: {
          include: {
            partnerLinkDetails: true,
          },
        },
        commissions: {
          where: {
            partnerId: partner.id,
            type: CommissionType.sale,
          },
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Map customers with their data
    const customersWithData = customers.map((customer) => {
      const transformed = transformCustomer({
        ...customer,
        firstSaleAt: customer.commissions[0]?.createdAt ?? null,
        email: customer.email
          ? customerDataSharingEnabledAt
            ? customer.email
            : obfuscateCustomerEmail(customer.email)
          : customer.name || generateRandomName(),
      });

      return PartnerProfileCustomerSchema.extend({
        ...(customerDataSharingEnabledAt && { name: z.string().nullish() }),
      }).parse({
        ...transformed,
        ...(ltvExcluded && { saleAmount: null }),
        activity: {
          ...customer,
          events: [],
          link: customer.link
            ? mapPartnerLinkDetails(customer.link)
            : customer.link,
        },
      });
    });

    return NextResponse.json(customersWithData);
  },
);
