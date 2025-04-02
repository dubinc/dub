import { getEvents } from "@/lib/analytics/get-events";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { decodeLinkIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { CustomerActivity, LeadEvent, SaleEvent } from "@/lib/types";
import { customerActivityResponseSchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { EventType } from "@dub/prisma/client";
import { currencyFormatter, getPrettyUrl } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/customers/[id]/activity - get a customer's activity
export const GET = withWorkspace(async ({ workspace, params, session }) => {
  const { id: customerId } = params;

  const customer = await getCustomerOrThrow({
    workspaceId: workspace.id,
    id: customerId,
  });

  if (!customer.linkId) {
    return NextResponse.json(
      customerActivityResponseSchema.parse({
        customer,
        activity: [],
        ltv: 0,
        timeToLead: null,
        timeToSale: null,
        link: null,
      }),
    );
  }

  let [leadEvents, saleEvents, link] = await Promise.all([
    getEvents({
      customerId: customer.id,
      event: "leads",
      sortOrder: "desc",
      sortBy: "timestamp",
      interval: "1y",
      page: 1,
      limit: 50,
    }),

    getEvents({
      customerId: customer.id,
      event: "sales",
      sortOrder: "desc",
      sortBy: "timestamp",
      interval: "1y",
      page: 1,
      limit: 50,
    }),

    prisma.link.findUniqueOrThrow({
      where: {
        id: customer.linkId!,
      },
      select: {
        id: true,
        domain: true,
        key: true,
        shortLink: true,
        folderId: true,
      },
    }),
  ]);

  if (link.folderId) {
    await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId: link.folderId,
      requiredPermission: "folders.read",
    });
  }

  const leadActivity = leadEvents.map((event: LeadEvent) => {
    return {
      timestamp: new Date(event.timestamp),
      event: EventType.lead,
      eventName: event.eventName,
      metadata: null,
    };
  });

  const saleActivity = saleEvents.map((event: SaleEvent) => {
    return {
      timestamp: new Date(event.timestamp),
      event: EventType.sale,
      eventName: event.eventName,
      eventDetails: currencyFormatter(event.sale.amount / 100, {
        maximumFractionDigits: 2,
      }),
      metadata: {
        amount: event.sale.amount,
        paymentProcessor: event.sale.paymentProcessor,
      },
    };
  });

  const activity: CustomerActivity[] = [...leadActivity, ...saleActivity].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  link = decodeLinkIfCaseSensitive(link);

  // Add click event to activities
  activity.push({
    timestamp: customer.clickedAt!,
    event: "click",
    eventName: "Link click",
    eventDetails: link?.shortLink ? getPrettyUrl(link.shortLink) : null,
    metadata: null,
  });

  // Find the LTV of the customer
  const ltv = activity.reduce((acc, { event, metadata }) => {
    if (event === "sale" && metadata) {
      acc += Number(metadata.amount);
    }

    return acc;
  }, 0);

  // Find the time to lead of the customer
  const timeToLead =
    customer.clickedAt && customer.createdAt
      ? customer.createdAt.getTime() - customer.clickedAt.getTime()
      : null;

  // Find the time to first sale of the customer
  const firstSale = activity.filter(({ event }) => event === "sale").pop();

  const timeToSale =
    firstSale && customer.createdAt
      ? new Date(firstSale.timestamp).getTime() - customer.createdAt.getTime()
      : null;

  return NextResponse.json(
    customerActivityResponseSchema.parse({
      ltv,
      timeToLead,
      timeToSale,
      customer: transformCustomer(customer),
      activity,
      link,
    }),
  );
});
