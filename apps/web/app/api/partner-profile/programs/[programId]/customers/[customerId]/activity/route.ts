import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { customerActivityResponseSchema } from "@/lib/zod/schemas/customer-activity";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/customers/:customerId/activity – Get a customer's activity by ID
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
      message:
        "Customer not found. Make sure you're using the correct customer ID (e.g. `cus_3TagGjzRzmsFJdH8od2BNCsc`).",
    });
  }

  if (!customer.linkId) {
    return NextResponse.json(
      customerActivityResponseSchema.parse({
        customer,
        events: [],
        ltv: 0,
        timeToLead: null,
        timeToSale: null,
        link: null,
      }),
    );
  }

  const events = await getCustomerEvents(
    {
      customerId: customer.id,
      linkIds: links.map((link) => link.id),
    },
    {
      sortOrder: "desc",
      interval: "1y",
    },
  );

  // get the first partner link that this customer interacted with
  const firstLinkId = events[0].link_id;
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
    customerActivityResponseSchema.parse({
      ltv,
      timeToLead,
      timeToSale,
      events,
      link,
    }),
  );
});
