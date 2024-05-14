import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { clickEventSchemaTB, trackSaleRequestSchema } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspaceEdge(
  async ({ req }) => {
    const {
      customerId,
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
        const leadEvent = await getLeadEvent({ customerId });

        if (!leadEvent || leadEvent.data.length === 0) {
          console.log("No lead event found for customer_id:", customerId);
          return;
        }

        const clickData = clickEventSchemaTB
          .omit({ timestamp: true })
          .parse(leadEvent.data[0]);

        await recordSale({
          ...clickData,
          customer_id: customerId,
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
