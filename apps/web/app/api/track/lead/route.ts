import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { createCustomer, getCustomer } from "@/lib/planetscale";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { clickEventSchemaTB, trackLeadRequestSchema } from "@/lib/zod/schemas";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/lead – Track a lead conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      clickId,
      eventName,
      metadata,
      customerName,
      customerEmail,
      customerAvatar,
      customerId: externalId,
    } = trackLeadRequestSchema.parse(await parseRequestBody(req));

    if (externalId) {
      const customer = await getCustomer({
        externalId,
        workspaceId: workspace.id,
      });

      if (customer) {
        throw new DubApiError({
          code: "conflict",
          message: `A customer with the customerId ${externalId} already exists in this workspace.`,
        });
      }
    }

    waitUntil(
      (async () => {
        const clickEvent = await getClickEvent({ clickId });

        if (!clickEvent || clickEvent.data.length === 0) {
          return;
        }

        const customerId = nanoid(16);
        const clickData = clickEventSchemaTB
          .omit({ timestamp: true })
          .parse(clickEvent.data[0]);

        await Promise.all([
          recordLead({
            ...clickData,
            event_name: eventName,
            event_id: nanoid(16),
            customer_id: customerId,
            metadata,
          }),

          workspace.stripeConnectId &&
            externalId &&
            (createCustomer({
              id: customerId,
              name: customerName || "",
              email: customerEmail || "",
              avatar: customerAvatar || "",
              externalId,
              projectId: workspace.id,
              projectConnectId: workspace.stripeConnectId,
              stripeCustomerId: null,
            }),
            recordCustomer({
              customer_id: customerId,
              name: customerName,
              email: customerEmail,
              avatar: customerAvatar,
              workspace_id: workspace.id,
            })),
        ]);
      })(),
    );

    return NextResponse.json({ success: true });
  },
  { betaFeature: true },
);
