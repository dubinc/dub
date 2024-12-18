import { DubApiError } from "@/lib/api/errors";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhookOnEdge } from "@/lib/webhook/publish-edge";
import { transformLeadEventData } from "@/lib/webhook/transform";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { prismaEdge } from "@dub/prisma/edge";
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
      externalId,
      customerId, // deprecated (but we'll support it for backwards compatibility)
      customerName,
      customerEmail,
      customerAvatar,
      metadata,
    } = trackLeadRequestSchema.parse(await parseRequestBody(req));

    const customerExternalId = externalId || customerId;

    if (!customerExternalId) {
      throw new DubApiError({
        code: "bad_request",
        message: "externalId is required",
      });
    }

    // deduplicate lead events – only record 1 event per hour
    const { success } = await ratelimit(1, "1 h").limit(
      `recordLead:${customerExternalId}:${eventName.toLowerCase().replace(" ", "-")}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: `Rate limit exceeded for customer ${customerExternalId}: ${eventName}`,
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

    const customer = await prismaEdge.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: customerExternalId,
        },
      },
    });

    if (customer) {
      throw new DubApiError({
        code: "conflict",
        message: `A customer with externalId ${customerExternalId} already exists. Use PATCH /api/customers/${customer.id} to update it.`,
      });
    }

    const finalCustomerName =
      customerName || customerEmail || generateRandomName();

    waitUntil(
      (async () => {
        const clickData = clickEventSchemaTB.parse(clickEvent.data[0]);

        const customer = await prismaEdge.customer.create({
          data: {
            id: createId({ prefix: "cus_" }),
            name: finalCustomerName,
            email: customerEmail,
            avatar: customerAvatar,
            externalId: customerExternalId,
            projectId: workspace.id,
            projectConnectId: workspace.stripeConnectId,
            clickId: clickData.click_id,
            linkId: clickData.link_id,
            country: clickData.country,
            clickedAt: new Date(clickData.timestamp + "Z"),
          },
        });

        const [_lead, link, _project] = await Promise.all([
          recordLead({
            ...clickData,
            event_id: nanoid(16),
            event_name: eventName,
            customer_id: customer.id,
            metadata: metadata ? JSON.stringify(metadata) : "",
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

          // update project usage
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

        const lead = transformLeadEventData({
          ...clickData,
          link,
          eventName,
          customerId: customer.id,
          customerExternalId: customer.externalId,
          customerName: customer.name,
          customerEmail: customer.email,
          customerAvatar: customer.avatar,
          customerCreatedAt: customer.createdAt,
        });

        await sendWorkspaceWebhookOnEdge({
          trigger: "lead.created",
          data: lead,
          workspace,
        });
      })(),
    );

    const lead = trackLeadResponseSchema.parse({
      click: {
        id: clickId,
      },
      customer: {
        name: finalCustomerName,
        email: customerEmail,
        avatar: customerAvatar,
        externalId: customerExternalId,
      },
    });

    return NextResponse.json({
      ...lead,
      // for backwards compatibility – will remove soon
      clickId,
      customerName: finalCustomerName,
      customerEmail: customerEmail,
      customerAvatar: customerAvatar,
    });
  },
  {
    requiredAddOn: "conversion",
    requiredPermissions: ["conversions.write"],
  },
);
