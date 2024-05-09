import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { trackLeadRequestSchema } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/lead – Track a lead conversion event
export const POST = withSessionEdge(async ({ req }) => {
  const {
    clickId,
    eventName,
    metadata,
    customerId,
    customerName,
    customerEmail,
    customerAvatar,
    workspaceId,
  } = trackLeadRequestSchema.parse(await parseRequestBody(req));

  waitUntil(
    (async () => {
      const clickEvent = await getClickEvent({ clickId });

      if (!clickEvent || clickEvent.data.length === 0) {
        return;
      }

      await Promise.all([
        recordLead({
          ...clickEvent.data[0],
          timestamp: new Date(Date.now()).toISOString(),
          event_name: eventName,
          event_id: nanoid(16),
          customer_id: customerId,
          metadata,
        }),
        ...(customerName || customerEmail || customerAvatar
          ? [
              recordCustomer({
                timestamp: new Date(Date.now()).toISOString(),
                customer_id: customerId,
                name: customerName,
                email: customerEmail,
                avatar: customerAvatar,
                workspace_id: workspaceId,
              }),
            ]
          : []),
      ]);
    })(),
  );

  return NextResponse.json({ success: true });
});
