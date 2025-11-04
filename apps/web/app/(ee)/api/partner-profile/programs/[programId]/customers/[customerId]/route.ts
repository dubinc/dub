import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import { LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS } from "@/lib/partners/constants";
import { PartnerProfileCustomerSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

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
    program.id === "prog_1K0QHV7MP3PR05CJSCF5VN93X" &&
    totalCommissions < LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
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
  });

  if (!customer || customer?.projectId !== program.workspaceId) {
    throw new DubApiError({
      code: "not_found",
      message: "Customer is not part of this program.",
    });
  }

  const events = await getCustomerEvents({
    customerId: customer.id,
    linkIds: links.map((link) => link.id),
  });

  if (events.length === 0) {
    throw new DubApiError({
      code: "not_found",
      message: "Customer is not attributed to any links by this partner.",
    });
  }

  // get the first partner link that this customer interacted with
  const firstLinkId = events[events.length - 1].link_id;
  const link = links.find((link) => link.id === firstLinkId);

  // Find the LTV of the customer
  // TODO: Calculate this from all events, not limited
  const ltv = events.reduce((acc, event) => {
    if (event.event === "sale" && event.saleAmount) {
      acc += Number(event.saleAmount);
    }

    return acc;
  }, 0);

  // Find the time to lead of the customer
  const timeToLead =
    customer.clickedAt && customer.createdAt
      ? customer.createdAt.getTime() - customer.clickedAt.getTime()
      : null;

  // Find the time to first sale of the customer
  // TODO: Calculate this from all events, not limited
  const firstSale = events.filter(({ event }) => event === "sale").pop();

  const timeToSale =
    firstSale && customer.createdAt
      ? new Date(firstSale.timestamp).getTime() - customer.createdAt.getTime()
      : null;

  return NextResponse.json(
    PartnerProfileCustomerSchema.extend({
      email: z.string(),
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
        ltv,
        timeToLead,
        timeToSale,
        events,
        link,
      },
    }),
  );
});
