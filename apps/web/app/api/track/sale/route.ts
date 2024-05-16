import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { clickEventSchemaTB, trackSaleRequestSchema } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      customerId: externalId,
      paymentProcessor,
      productId,
      invoiceId,
      amount,
      currency,
      recurring,
      recurringInterval,
      recurringIntervalCount,
      refunded,
      metadata,
    } = trackSaleRequestSchema.parse(await parseRequestBody(req));

    waitUntil(
      (async () => {
        // Find customer
        const customer = await prismaEdge.customer.findUnique({
          where: {
            projectId_externalId: {
              projectId: workspace.id,
              externalId,
            },
          },
        });

        if (!customer) {
          console.log("No customer found for externalId:", externalId);
          return;
        }

        // Find lead
        const leadEvent = await getLeadEvent({ customerId: customer.id });
        if (!leadEvent || leadEvent.data.length === 0) {
          console.log("No lead event found for customerId:", customer.id);
          return;
        }

        const clickData = clickEventSchemaTB
          .omit({ timestamp: true })
          .parse(leadEvent.data[0]);

        await recordSale({
          ...clickData,
          customer_id: customer.id,
          event_id: nanoid(16),
          payment_processor: paymentProcessor,
          product_id: productId,
          invoice_id: invoiceId,
          amount,
          currency,
          recurring: recurring ? 1 : 0,
          recurring_interval: recurringInterval,
          recurring_interval_count: recurringIntervalCount,
          refunded: refunded ? 1 : 0,
          metadata: metadata ? JSON.stringify(metadata) : "",
        });
      })(),
    );

    return NextResponse.json({ success: true });
  },
  { betaFeature: true },
);
