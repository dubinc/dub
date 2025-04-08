import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { decodeLinkIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { customerActivityResponseSchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
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

  let [events, link] = await Promise.all([
    getCustomerEvents(
      { customerId: customer.id, clickId: customer.clickId! },
      {
        sortOrder: "desc",
        interval: "1y",
      },
    ),

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

  // const leadActivity = leadEvents.map((event: LeadEvent) => {
  //   return {
  //     timestamp: new Date(event.timestamp),
  //     event: EventType.lead,
  //     eventName: event.eventName,
  //     metadata: null,
  //   };
  // });

  // const saleActivity = saleEvents.map((event: SaleEvent) => {
  //   return {
  //     timestamp: new Date(event.timestamp),
  //     event: EventType.sale,
  //     eventName: event.eventName,
  //     eventDetails: currencyFormatter(event.sale.amount / 100, {
  //       maximumFractionDigits: 2,
  //     }),
  //     metadata: {
  //       amount: event.sale.amount,
  //       paymentProcessor: event.sale.paymentProcessor,
  //     },
  //   };
  // });

  // const activity: CustomerActivity[] = [...leadActivity, ...saleActivity].sort(
  //   (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  // );

  link = decodeLinkIfCaseSensitive(link);

  // // Add click event to activities
  // activity.push({
  //   timestamp: customer.clickedAt!,
  //   event: "click",
  //   eventName: "Link click",
  //   eventDetails: link?.shortLink ? getPrettyUrl(link.shortLink) : null,
  //   metadata: null,
  // });

  // Find the LTV of the customer
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
      customer: transformCustomer(customer),
      events,
      link,
    }),
  );
});
