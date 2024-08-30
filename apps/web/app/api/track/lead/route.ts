import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { prismaEdge } from "@/lib/prisma/edge";
import { getClickEvent, recordCustomer, recordLead } from "@/lib/tinybird";
import { ratelimit } from "@/lib/upstash";
import { sendLinkWebhookOnEdge } from "@/lib/webhook/publish-edge";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
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
      customerId: externalId,
      customerName,
      customerEmail,
      customerAvatar,
      metadata,
    } = trackLeadRequestSchema.parse(await parseRequestBody(req));

    // deduplicate lead events – only record 1 event per hour
    const { success } = await ratelimit(1, "1 h").limit(
      `recordLead:${externalId}:${eventName.toLowerCase().replace(" ", "-")}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: `Rate limit exceeded for customer ${externalId}: ${eventName}`,
      });
    }

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

    const finalCustomerName =
      customerName || customerEmail || generateRandomName();

    // Find customer or create if not exists
    const customer = await prismaEdge.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        name: finalCustomerName,
        email: customerEmail,
        avatar: customerAvatar,
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
      update: {
        name: finalCustomerName,
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

    const [_lead, _customer, link, _project] = await Promise.all([
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
      prismaEdge.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          usage: {
            increment: 1,
          },
        },
      }),
    ]);

    const response = trackLeadResponseSchema.parse({
      clickId,
      eventName,
      customerId: externalId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      metadata,
    });

    waitUntil(
      (async () => {
        sendLinkWebhookOnEdge({
          trigger: "lead.created",
          linkId: link.id,
          data: transformLeadEventData({
            ...response,
            ...clickData,
            link,
          }),
        });
      })(),
    );

    return NextResponse.json(response);
  },
  {
    requiredAddOn: "conversion",
    requiredPermissions: ["conversions.write"],
  },
);
