import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { isStored, storage } from "@/lib/storage";
import { getClickEvent, recordLead, recordLeadSync } from "@/lib/tinybird";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { ClickEventTB, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { Customer, WorkflowTrigger } from "@dub/prisma/client";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { executeWorkflows } from "../workflows/execute-workflows";

type TrackLeadParams = z.input<typeof trackLeadRequestSchema> & {
  rawBody: any;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
};

export const trackLead = async ({
  clickId,
  eventName,
  eventQuantity,
  customerExternalId,
  customerName,
  customerEmail,
  customerAvatar,
  mode,
  metadata,
  rawBody,
  workspace,
}: TrackLeadParams) => {
  if (!clickId) {
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: customerExternalId,
        },
      },
    });

    if (!existingCustomer || !existingCustomer.clickId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The `clickId` property was not provided in the request, and no existing customer with the provided `customerExternalId` was found.",
      });
    }

    clickId = existingCustomer.clickId;
  }

  const stringifiedEventName = eventName.toLowerCase().replaceAll(" ", "-");

  // deduplicate lead events – only record 1 unique event for the same customer and event name
  const ok = await redis.set(
    `trackLead:${workspace.id}:${customerExternalId}:${stringifiedEventName}`,
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
      ex: 60 * 60 * 24 * 7, // cache for 1 week
      nx: true,
    },
  );

  const customerId = createId({ prefix: "cus_" });
  const finalCustomerName =
    customerName || customerEmail || generateRandomName();
  const finalCustomerAvatar =
    customerAvatar && !isStored(customerAvatar)
      ? `${R2_URL}/customers/${customerId}/avatar_${nanoid(7)}`
      : customerAvatar;

  if (ok) {
    // Find click event
    let clickData: ClickEventTB | null = null;
    const clickEvent = await getClickEvent({ clickId });

    if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
      clickData = clickEvent.data[0];
    }

    if (!clickData) {
      const cachedClickData = await redis.get<ClickEventTB>(
        `clickIdCache:${clickId}`,
      );

      if (cachedClickData) {
        clickData = {
          ...cachedClickData,
          timestamp: cachedClickData.timestamp
            .replace("T", " ")
            .replace("Z", ""),
          qr: cachedClickData.qr ? 1 : 0,
          bot: cachedClickData.bot ? 1 : 0,
        };
      }
    }

    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    const link = await prisma.link.findUnique({
      where: {
        id: clickData.link_id,
      },
      select: {
        projectId: true,
      },
    });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for clickId: ${clickId}`,
      });
    }

    if (link.projectId !== workspace.id) {
      throw new DubApiError({
        code: "not_found",
        message: `Link for clickId ${clickId} does not belong to the workspace`,
      });
    }

    const leadEventId = nanoid(16);

    // Create a function to handle customer upsert to avoid duplication
    const upsertCustomer = async () => {
      return prisma.customer.upsert({
        where: {
          projectId_externalId: {
            projectId: workspace.id,
            externalId: customerExternalId,
          },
        },
        create: {
          id: customerId,
          name: finalCustomerName,
          email: customerEmail,
          avatar: finalCustomerAvatar,
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
    };

    // Create a function to prepare the lead event payload
    const createLeadEventPayload = (customerId: string) => {
      const basePayload = {
        ...clickData,
        event_id: leadEventId,
        event_name: eventName,
        customer_id: customerId,
        metadata: metadata ? JSON.stringify(metadata) : "",
      };

      return eventQuantity
        ? Array(eventQuantity)
            .fill(null)
            .map(() => ({
              ...basePayload,
              event_id: nanoid(16),
            }))
        : basePayload;
    };

    let customer: Customer | undefined;

    // if wait mode, create the customer and record the lead event synchronously
    if (mode === "wait") {
      customer = await upsertCustomer();

      const leadEventPayload = createLeadEventPayload(customer.id);
      const cacheLeadEventPayload = Array.isArray(leadEventPayload)
        ? leadEventPayload[0]
        : leadEventPayload;

      await Promise.all([
        // Use recordLeadSync which waits for the operation to complete
        recordLeadSync(leadEventPayload),

        // Cache the latest lead event for 5 minutes because the ingested event is not available immediately on Tinybird
        // we're setting two keys because we want to support the use case where the customer has multiple lead events
        redis.set(`leadCache:${customer.id}`, cacheLeadEventPayload, {
          ex: 60 * 5,
        }),
        redis.set(
          `leadCache:${customer.id}:${stringifiedEventName}`,
          cacheLeadEventPayload,
          {
            ex: 60 * 5,
          },
        ),
      ]);
    }

    waitUntil(
      (async () => {
        // for async and deferred mode, create the customer in the background
        if (mode === "async" || mode === "deferred") {
          customer = await upsertCustomer();
          console.log(`customer created: ${JSON.stringify(customer, null, 2)}`);

          // for async mode, record the lead event right away
          // for deferred mode, we defer the lead event creation to a subsequent request
          if (mode === "async") {
            const res = await recordLead(createLeadEventPayload(customer.id));
            console.log("lead event recorded:", res);
          }
        }

        // track the conversion event
        await logConversionEvent({
          workspace_id: workspace.id,
          link_id: clickData.link_id,
          path: "/track/lead",
          body: JSON.stringify(rawBody),
        });

        if (
          customerAvatar &&
          !isStored(customerAvatar) &&
          finalCustomerAvatar
        ) {
          // persist customer avatar to R2
          await storage.upload(
            finalCustomerAvatar.replace(`${R2_URL}/`, ""),
            customerAvatar,
            {
              width: 128,
              height: 128,
            },
          );
        }

        // if not deferred mode, process the following right away:
        // - update link leads count
        // - update workspace events usage
        // - update customer leads count
        // - create partner commission (for partner links)
        // - execute workflows (for partner links)
        // - send lead.created webhook

        if (mode !== "deferred") {
          const [link, _project] = await Promise.all([
            // update link leads count
            prisma.link.update({
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

            // update workspace events usage
            prisma.project.update({
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

          if (link.programId && link.partnerId && customer) {
            await createPartnerCommission({
              event: "lead",
              programId: link.programId,
              partnerId: link.partnerId,
              linkId: link.id,
              eventId: leadEventId,
              customerId: customer.id,
              quantity: eventQuantity ?? 1,
              context: {
                customer: {
                  country: customer.country,
                },
              },
            });

            await executeWorkflows({
              trigger: WorkflowTrigger.leadRecorded,
              programId: link.programId,
              partnerId: link.partnerId,
            });
          }

          await sendWorkspaceWebhook({
            trigger: "lead.created",
            data: transformLeadEventData({
              ...clickData,
              eventName,
              link,
              customer,
            }),
            workspace,
          });
        }
      })(),
    );
  }

  return trackLeadResponseSchema.parse({
    click: {
      id: clickId,
    },
    customer: {
      name: finalCustomerName,
      email: customerEmail,
      avatar: finalCustomerAvatar,
      externalId: customerExternalId,
    },
  });
};
