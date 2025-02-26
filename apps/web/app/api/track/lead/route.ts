import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { createId, parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { getClickEvent, recordLeadSync } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhookOnEdge } from "@/lib/webhook/publish-edge";
import { transformLeadEventData } from "@/lib/webhook/transform";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { prismaEdge } from "@dub/prisma/edge";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { determinePartnerReward } from "../determine-partner-reward-edge";

export const runtime = "edge";

// POST /api/track/lead – Track a lead conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      clickId,
      eventName,
      eventQuantity,
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

    // deduplicate lead events – only record 1 unique event for the same customer and event name
    const ok = await redis.set(
      `trackLead:${workspace.id}:${customerExternalId}:${eventName.toLowerCase().replace(" ", "-")}`,
      {
        timestamp: Date.now(),
        clickId,
        eventName,
        customerExternalId,
        customerName,
        customerEmail,
        customerAvatar,
      },
      {
        nx: true,
      },
    );

    if (!ok) {
      throw new DubApiError({
        code: "conflict",
        message: `Customer with externalId ${customerExternalId} and event name ${eventName} has already been recorded.`,
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

    const clickData = clickEvent.data[0];

    const finalCustomerName =
      customerName || customerEmail || generateRandomName();

    const customer = await prismaEdge.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: customerExternalId,
        },
      },
      create: {
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
      update: {}, // no updates needed if the customer exists
    });

    const eventId = nanoid(16);
    const leadEventPayload = {
      ...clickData,
      event_id: eventId,
      event_name: eventName,
      customer_id: customer.id,
      metadata: metadata ? JSON.stringify(metadata) : "",
    };

    await recordLeadSync(
      eventQuantity
        ? Array(eventQuantity)
            .fill(null)
            .map(() => ({
              ...leadEventPayload,
              event_id: nanoid(16),
            }))
        : leadEventPayload,
    );

    waitUntil(
      (async () => {
        const [link, _project] = await Promise.all([
          // update link leads count
          prismaEdge.link.update({
            where: {
              id: clickData.link_id,
            },
            data: {
              leads: {
                increment: eventQuantity ?? 1,
              },
            },
            include: includeTags,
          }),

          // update workspace usage
          prismaEdge.project.update({
            where: {
              id: workspace.id,
            },
            data: {
              usage: {
                increment: eventQuantity ?? 1,
              },
            },
          }),
        ]);

        if (link.programId && link.partnerId) {
          const reward = await determinePartnerReward({
            programId: link.programId,
            partnerId: link.partnerId,
            event: "lead",
          });

          if (reward) {
            await prismaEdge.commission.create({
              data: {
                id: createId({ prefix: "cm_" }),
                programId: link.programId,
                linkId: link.id,
                partnerId: link.partnerId,
                eventId,
                customerId: customer.id,
                type: "lead",
                amount: 0,
                quantity: eventQuantity ?? 1,
                earnings: eventQuantity
                  ? reward.amount * eventQuantity
                  : reward.amount,
              },
            });
          }
        }

        await sendWorkspaceWebhookOnEdge({
          trigger: "lead.created",
          data: transformLeadEventData({
            ...clickData,
            eventName,
            link,
            customer,
          }),
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
      // for backwards compatibility – will remove soon
      clickId,
      customerName: finalCustomerName,
      customerEmail: customerEmail,
      customerAvatar: customerAvatar,
    });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);
