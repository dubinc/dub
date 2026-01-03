import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { generateRandomName } from "@/lib/names";
import {
  PartnerProfileCustomerSchema,
  getPartnerCustomersQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/:programId/customers – Get all customers for a partner program
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const { search, country, linkId, sortBy, sortOrder, page, pageSize } =
      getPartnerCustomersQuerySchema.parse(searchParams);

    const { program, totalCommissions, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: programId,
        include: {
          program: true,
        },
      });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
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
        link: true,
        commissions: {
          where: {
            partnerId: partner.id,
          },
          take: 1,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
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
      const timeToLead =
        customer.clickedAt && customer.createdAt
          ? customer.createdAt.getTime() - customer.clickedAt.getTime()
          : null;

      return PartnerProfileCustomerSchema.extend({
        ...(customerDataSharingEnabledAt && { name: z.string().nullish() }),
      }).parse({
        ...transformCustomer({
          ...customer,
          email: customer.email
            ? customerDataSharingEnabledAt
              ? customer.email
              : customer.email.replace(/(?<=^.).+(?=.@)/, "****")
            : customer.name || generateRandomName(),
        }),
        activity: {
          ltv: customer.saleAmount,
          timeToLead,
          timeToSale: null,
          firstSaleDate: customer.commissions[0]?.createdAt ?? null,
          events: [],
          link: customer.link,
        },
      });
    });

    return NextResponse.json(customersWithData);
  },
);
