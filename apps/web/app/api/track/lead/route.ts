import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { nanoid } from "@dub/utils";
import { Customer } from "@prisma/client";
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

    // Find click event
    const clickEvent = await getClickEvent({ clickId });

    if (!clickEvent || clickEvent.data.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    const clickData = clickEventSchemaTB
      .omit({ timestamp: true })
      .parse(clickEvent.data[0]);

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
          name: customerName, // TODO: Generate random name if not provided
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

    if (!customer) {
      throw new DubApiError({
        code: "bad_request",
        message: `Failed to create customer with customerId: ${externalId}`,
      });
    }

    await Promise.all([
      recordCustomer({
        workspace_id: workspace.id,
        customer_id: customer.id,
        name: customerName || "",
        email: customerEmail || "",
        avatar: customerAvatar || "",
      }),

      recordLead({
        ...clickData,
        event_id: nanoid(16),
        event_name: eventName,
        customer_id: customer.id,
        metadata,
      }),
    ]);

    const response = trackLeadResponseSchema.parse({
      clickId,
      eventName,
      customerName,
      customerEmail,
      customerAvatar,
      customerId: externalId,
      metadata: metadata ? JSON.parse(metadata) : null,
    });

    return NextResponse.json(response);
  },
  { betaFeature: true },
);
