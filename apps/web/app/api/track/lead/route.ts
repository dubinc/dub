import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { prismaEdge } from "@/lib/prisma/edge";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/lead – Track a lead conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      clickId,
      eventName,
      customerId: externalId,
      customerName,
      customerEmail,
      customerAvatar,
      metadata,
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

    const randomId = `cus_${nanoid(16)}`;
    const randomName = generateRandomName();

    // Find customer or create if not exists
    const customer = await prismaEdge.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        id: randomId,
        name: customerName || randomName,
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

    if (!customer) {
      throw new DubApiError({
        code: "bad_request",
        message: `Failed to create customer with customerId: ${externalId}`,
      });
    }

    await Promise.all([
      recordLead({
        ...clickData,
        event_id: nanoid(16),
        event_name: eventName,
        customer_id: customer.id,
        metadata: metadata ? JSON.stringify(metadata) : "",
      }),

      recordCustomer({
        workspace_id: workspace.id,
        customer_id: customer.id,
        name: customer.name || "",
        email: customer.email || "",
        avatar: customer.avatar || "",
      }),

      // update link leads count
      prismaEdge.link.update({
        where: {
          id: clickData.link_id,
        },
        data: {
          leads: {
            increment: 1,
          },
        },
      }),
    ]);

    const response = trackLeadResponseSchema.parse({
      clickId,
      eventName,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      externalId: customer.externalId,
      metadata,
    });

    return NextResponse.json(response, { status: 201 });
  },
  { betaFeature: true },
);
