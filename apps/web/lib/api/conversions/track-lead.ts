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
import { WorkflowTrigger } from "@dub/prisma/client";
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
  customerExternalId,
  customerName,
  customerEmail,
  customerAvatar,
  mode,
  eventQuantity,
  metadata,
  rawBody,
  workspace,
}: TrackLeadParams) => {
  // try to find the customer to use if it exists
  let customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customerExternalId,
      },
    },
  });

  // if clickId is an empty string, use the existing customer's clickId if it exists
  // otherwise, throw an error (this is for mode="deferred" lead tracking)
  if (!clickId) {
    if (!customer || !customer.clickId) {
      return trackLeadResponseSchema.parse({
        click: null,
        customer: null,
      });
    }

    clickId = customer.clickId;
  }

  const stringifiedEventName = eventName.toLowerCase().replaceAll(" ", "-");
  const finalCustomerId = createId({ prefix: "cus_" });
  const finalCustomerName =
    customerName || customerEmail || generateRandomName();
  const finalCustomerAvatar =
    customerAvatar && !isStored(customerAvatar)
      ? `${R2_URL}/customers/${finalCustomerId}/avatar_${nanoid(7)}`
      : customerAvatar;

  let isDuplicateEvent = false;

  // if not deferred mode, we need to deduplicate lead events – only record 1 unique event for the same customer and event name
  // TODO: Maybe we can replace this to rely only on MySQL directly since we're checking the customer above?
  if (mode !== "deferred") {
    const res = await redis.set(
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
    // if res = null it means the key was already set
    isDuplicateEvent = res === null ? true : false;
  }

  // if it's not a duplicate event
  // (e.g. mode === 'deferred' or it's regular mode but the first time processing this event)
  // we can proceed with the lead tracking process
  if (!isDuplicateEvent) {
    // First, we need to find the click event
    let clickData: ClickEventTB | null = null;
    const clickEvent = await getClickEvent({ clickId });

    if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
      clickData = clickEvent.data[0];
    }

    // if there is no click data in Tinybird yet, check the clickIdCache
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

    // if there is still no click data, throw an error
    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    // get the referral link from the from the clickData
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

    // if the customer doesn't exist in our MySQL DB yet, upsert it
    // (here we're doing upsert and not create in case of race conditions)
    if (!customer) {
      customer = await prisma.customer.upsert({
        where: {
          projectId_externalId: {
            projectId: workspace.id,
            externalId: customerExternalId,
          },
        },
        create: {
          id: finalCustomerId,
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
        update: {},
      });
    }

    // if wait mode, record the lead event synchronously
    if (mode === "wait") {
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
        // for async mode, record the lead event in the background
        // for deferred mode, defer the lead event creation to a subsequent request
        if (mode === "async") {
          await recordLead(createLeadEventPayload(customer.id));
        }

        // track the conversion event in our logs
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
        // - update link, workspace, and customer stats
        // - for partner links, create partner commission and execute workflows
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
    customer: customer ?? {
      name: finalCustomerName,
      email: customerEmail || null,
      avatar: finalCustomerAvatar || null,
      externalId: customerExternalId,
    },
  });
};
