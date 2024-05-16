import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { nanoid } from "@dub/utils";
import { Customer } from "@prisma/client";
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

    // if (externalId && !workspace.stripeConnectId) {
    //   throw new DubApiError({
    //     code: "bad_request",
    //     message: `Please connect your Stripe account to track customers.`,
    //   });
    // }

    waitUntil(
      (async () => {
        const clickEvent = await getClickEvent({ clickId });

        if (!clickEvent || clickEvent.data.length === 0) {
          return;
        }

        const clickData = clickEventSchemaTB
          .omit({ timestamp: true })
          .parse(clickEvent.data[0]);

        // TODO
        // Generate random name if not provided

        // Find customer or create if not exists
        let customer: null | Customer = null;

        if (externalId && workspace.stripeConnectId) {
          customer = await prismaEdge.customer.upsert({
            where: {
              projectId_externalId: {
                projectId: workspace.id,
                externalId,
              },
            },
            create: {
              id: nanoid(16),
              name: customerName,
              email: customerEmail,
              avatar: customerAvatar,
              externalId,
              projectId: workspace.id,
              projectConnectId: workspace.stripeConnectId,
            },
            update: {
              name: customerName,
              email: customerEmail,
              avatar: customerAvatar,
            },
          });
        }

        await Promise.all([
          recordLead({
            ...clickData,
            event_id: nanoid(16),
            event_name: eventName,
            customer_id: customer?.id,
            metadata,
          }),

          ...(customer
            ? [
                recordCustomer({
                  customer_id: customer?.id,
                  name: customerName,
                  email: customerEmail,
                  avatar: customerAvatar,
                  workspace_id: workspace.id,
                }),
              ]
            : []),
        ]);
      })(),
    );

    return NextResponse.json({ success: true });
  },
  { betaFeature: true },
);
