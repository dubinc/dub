import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import { PartnerProfileCustomerSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/customers/:customerId – Get a customer by ID
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { customerId, programId } = params;

  const { program, links } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: programId,
  });

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
    PartnerProfileCustomerSchema.parse({
      ...transformCustomer({
        ...customer,
        email: customer.email || customer.name || generateRandomName(),
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
