import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { detectAndRecordFraudEvent } from "@/lib/api/fraud/detect-record-fraud-event";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { isStored, storage } from "@/lib/storage";
import { getClickEvent, recordLead } from "@/lib/tinybird";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformLeadEventData } from "@/lib/webhook/transform";
import {
  trackLeadRequestSchema,
  trackLeadResponseSchema,
} from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { Link, WorkflowTrigger } from "@dub/prisma/client";
import { nanoid, pick, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { syncPartnerLinksStats } from "../partners/sync-partner-links-stats";
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
  let link: Link | null = null;

  // if clickId is an empty string, use the existing customer's clickId if it exists
  // otherwise, throw an error (this is for mode="deferred" lead tracking)
  if (!clickId) {
    if (!customer || !customer.clickId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The `clickId` property was not provided in the request, and no existing customer with the provided `customerExternalId` was found.",
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
    const clickData = await getClickEvent({ clickId });

    // if there is no click data, throw an error
    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    // get the referral link from the from the clickData
    link = await prisma.link.findUnique({
      where: {
        id: clickData.link_id,
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
        message: `Link ${link.id} for clickId ${clickId} does not belong to the workspace`,
      });
    }

    if (link.disabledAt) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${link.id} for clickId ${clickId} is disabled, lead not tracked`,
      });
    }

    const leadEventId = nanoid(16);

    // Create a function to prepare the lead event payload
    const createLeadEventPayload = (customerId: string) => {
      const basePayload = {
        ...clickData,
        workspace_id: clickData.workspace_id || workspace.id, // in case for some reason the click event doesn't have workspace_id
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
          linkId: link.id,
          programId: link.programId,
          partnerId: link.partnerId,
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
        // for deferred mode, we defer the lead event creation to a subsequent request
        if (mode !== "deferred") {
          await recordLead(createLeadEventPayload(customer.id));
        }

        // track the conversion event in our logs
        await logConversionEvent({
          workspace_id: workspace.id,
          link_id: link.id,
          path: "/track/lead",
          body: JSON.stringify(rawBody),
        });

        if (
          customerAvatar &&
          !isStored(customerAvatar) &&
          finalCustomerAvatar
        ) {
          // persist customer avatar to R2
          await storage
            .upload({
              key: finalCustomerAvatar.replace(`${R2_URL}/`, ""),
              body: customerAvatar,
              opts: {
                width: 128,
                height: 128,
              },
            })
            .catch(async (error) => {
              console.error("Error persisting customer avatar to R2", error);
              // if the avatar fails to upload to R2, set the avatar to null in the database
              if (customer) {
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: { avatar: null },
                });
              }
            });
        }

        // if not deferred mode, process the following right away:
        // - update link, workspace, and customer stats
        // - for partner links, create partner commission and execute workflows
        // - send lead.created webhook

        if (mode !== "deferred") {
          const [updatedLink, _project] = await Promise.all([
            // update link leads count
            prisma.link.update({
              where: {
                id: link.id,
              },
              data: {
                leads: {
                  increment: eventQuantity ?? 1,
                },
                lastLeadAt: new Date(),
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
          link = updatedLink; // update the link variable to the latest version

          let createdCommission:
            | Awaited<ReturnType<typeof createPartnerCommission>>
            | undefined = undefined;

          if (link.programId && link.partnerId && customer) {
            createdCommission = await createPartnerCommission({
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

            const { webhookPartner, programEnrollment } = createdCommission;

            await Promise.allSettled([
              executeWorkflows({
                trigger: WorkflowTrigger.leadRecorded,
                context: {
                  programId: link.programId,
                  partnerId: link.partnerId,
                  current: {
                    leads: 1,
                  },
                },
              }),

              syncPartnerLinksStats({
                partnerId: link.partnerId,
                programId: link.programId,
                eventType: "lead",
              }),

              webhookPartner &&
                detectAndRecordFraudEvent({
                  program: { id: link.programId },
                  partner: pick(webhookPartner, ["id", "email", "name"]),
                  programEnrollment: pick(programEnrollment, ["status"]),
                  customer: pick(customer, ["id", "email", "name"]),
                  link: pick(link, ["id"]),
                  click: pick(clickData, ["url", "referer"]),
                  event: { id: leadEventId },
                }),
            ]);
          }

          await sendWorkspaceWebhook({
            trigger: "lead.created",
            data: transformLeadEventData({
              ...clickData,
              eventName,
              link,
              customer,
              partner: createdCommission?.webhookPartner,
              metadata,
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
    link,
    customer: customer ?? {
      name: finalCustomerName,
      email: customerEmail || null,
      avatar: finalCustomerAvatar || null,
      externalId: customerExternalId,
    },
  });
};
