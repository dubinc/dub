import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { trackSaleRequestSchema } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/sale – Track a sale conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const {
    customerId,
    paymentProcessor,
    productId,
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
      const leadEvent = await getLeadEvent({ customer_id: customerId });

      if (!leadEvent || leadEvent.data.length === 0) {
        return;
      }

      await recordSale({
        ...leadEvent.data[0], // TODO: need to omit `timestamp` so we can let Tinybird auto-generate it on insert
        event_id: nanoid(16),
        payment_processor: paymentProcessor,
        product_id: productId,
        amount,
        currency,
        recurring,
        recurring_interval: recurringInterval,
        recurring_interval_count: recurringIntervalCount,
        refunded,
        metadata: metadata ? JSON.stringify(metadata) : "",
      });
    })(),
  );

  return NextResponse.json({ success: true });
});
