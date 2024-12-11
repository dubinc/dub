import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCustomerEvents } from "@/lib/tinybird/get-customer-events";
import { CustomerSchema } from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";
import { z } from "zod";

const CustomerActivitySchema = z.object({
  timestamp: z.date(),
  event: z.enum(["click", "lead", "sale"]),
  event_name: z.string(),
  metadata: z.union([
    z.null(),
    z.object({
      payment_processor: z.string(),
      amount: z.string(),
    }),
  ]),
});

const schema = z.object({
  ltv: z.number(),
  timeToLead: z.number(),
  timeToSale: z.number(),
  customer: CustomerSchema,
  activities: z.array(CustomerActivitySchema),
});

// GET /api/customers/[id]/activities - get a customer's activity
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { id: customerId } = params;

  const customer = await getCustomerOrThrow({
    workspaceId: workspace.id,
    id: customerId,
  });

  const events = await getCustomerEvents({
    customerId,
  });

  const activities = events.data.map((event) => ({
    ...event,
    metadata: event.metadata ? JSON.parse(event.metadata) : null,
    timestamp: new Date(event.timestamp),
  }));

  // Add click event to activities
  activities.push({
    timestamp: customer.clickedAt!,
    event: "click",
    event_name: "Link click",
    metadata: null,
  });

  // Find the LTV of the customer
  const ltv = activities.reduce((acc, { event, metadata }) => {
    if (event === "sale" && metadata) {
      acc += Number(metadata.amount);
    }

    return acc;
  }, 0);

  // Find the time to lead of the customer
  const timeToLead =
    customer.clickedAt && customer.leadCreatedAt
      ? customer.leadCreatedAt.getTime() - customer.clickedAt.getTime()
      : 0;

  // Find the time to first sale of the customer
  const firstSale = activities.filter(({ event }) => event === "sale").pop();

  const timeToSale =
    firstSale && customer.leadCreatedAt
      ? new Date(firstSale.timestamp).getTime() -
        customer.leadCreatedAt.getTime()
      : 0;

  return NextResponse.json(
    schema.parse({
      ltv,
      timeToLead,
      timeToSale,
      customer,
      activities,
    }),
  );
});
