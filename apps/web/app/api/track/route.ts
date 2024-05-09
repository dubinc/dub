import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent, recordLead, recordSale } from "@/lib/tinybird";
import { conversionRequestSchema } from "@/lib/zod/schemas/conversions";
import { log, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track – Track a click conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const body = conversionRequestSchema.parse(await parseRequestBody(req));
  const { clickId, eventName, eventType, metadata, customerId } = body;

  waitUntil(
    (async () => {
      const clickEvent = await getClickEvent({ clickId });

      if (!clickEvent || clickEvent.data.length === 0) {
        return;
      }

      const conversionEvent = {
        ...clickEvent.data[0],
        timestamp: new Date(Date.now()).toISOString(),
        event_id: nanoid(16),
        customer_id: customerId,
        metadata,
      };

      await Promise.all([
        eventType === "lead"
          ? recordLead({
              ...conversionEvent,
              event_name: eventName,
            })
          : recordSale({
              ...conversionEvent,

              // TODO: Fix this
              payment_processor: "stripe",
              stripe_customer_id: "",
              product_id: "",
              amount: 1000,
              currency: "usd",
              recurring: true,
              recurring_interval: "month",
              recurring_interval_count: 1,
              refunded: false,
            }),

        // TODO: Remove this before launch
        log({
          message: `*Conversion event recorded*: Customer *${customerId}* converted on click *${clickId}* with event *${eventName}*.`,
          type: "alerts",
        }),
      ]);
    })(),
  );

  return NextResponse.json({ success: true });
});
