import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
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
import { prisma } from "@/lib/prisma";
import { PartnerProfileCustomerSchema } from "@/lib/zod/schemas/partner-profile";
import { toCentsNumber } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/:programId/customers/:customerId – Get a customer by ID
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { customerId, programId } = params;

  const { program, links, totalCommissions, customerDataSharingEnabledAt } =
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
      include: {
        program: true,
        links: true,
      },
    });

  if (
    LARGE_PROGRAM_IDS.includes(program.id) &&
    toCentsNumber(totalCommissions) < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "This feature is not available for your program.",
    });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      // find the first sale commission for this customer and partner
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
  });

  if (!customer || customer?.projectId !== program.workspaceId) {
    throw new DubApiError({
      code: "not_found",
      message: "Customer is not part of this program.",
    });
  }

  const partnerLinkIds = links.map((link) => link.id);

  const events = await getCustomerEvents({
    customerId: customer.id,
    linkIds: partnerLinkIds,
    includeMetadata: false,
  });

  // if there are events between the partner-customer, use the last event's link id
  // else, check if the customer.linkId actually belongs to the partner
  // if it does, use it, otherwise, throw an error
  const attributedPartnerLinkId =
    events.length > 0
      ? events[events.length - 1].link_id
      : customer.linkId && partnerLinkIds.includes(customer.linkId)
        ? customer.linkId
        : null;

  if (!attributedPartnerLinkId) {
    throw new DubApiError({
      code: "not_found",
      message: "Customer is not attributed to any links by this partner.",
    });
  }

  // get the partner link that this customer interacted with
  const link = links.find((link) => link.id === attributedPartnerLinkId);

  return NextResponse.json(
    PartnerProfileCustomerSchema.extend({
      ...(customerDataSharingEnabledAt && { name: z.string().nullish() }),
    })
      .omit({
        ...(CUSTOMER_LTV_EXCLUDED_PROGRAM_IDS.includes(program.id) && {
          saleAmount: true,
        }),
      })
      .parse({
        ...transformCustomer({
          ...customer,
          firstSaleAt: customer.commissions[0]?.createdAt ?? null,
          email: customer.email
            ? customerDataSharingEnabledAt
              ? customer.email
              : obfuscateCustomerEmail(customer.email)
            : customer.name || generateRandomName(),
        }),
        activity: {
          ...customer,
          events,
          link,
        },
      }),
  );
});
