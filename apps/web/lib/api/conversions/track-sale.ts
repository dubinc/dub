import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createOrGetCustomer } from "@/lib/api/customers/create-or-get-customer";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import {
  getClickEvent,
  getLeadEvent,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import {
  ClickEventTB,
  CustomerSource,
  LeadEventTB,
  WorkspaceProps,
} from "@/lib/types";
import { redis } from "@/lib/upstash";
import { publishWorkspaceClicksUsageEvent } from "@/lib/upstash/redis-streams/workspace-clicks-usage";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  transformLeadEventData,
  transformSaleEventData,
} from "@/lib/webhook/transform";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { nanoid, R2_URL } from "@dub/utils";
import { Customer } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { createId } from "../create-id";
import { syncPartnerLinksStats } from "../partners/sync-partner-links-stats";
import { executeWorkflows } from "../workflows/execute-workflows";

type TrackSaleParams = z.input<typeof trackSaleRequestSchema> & {
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  source?: CustomerSource; // default is "tracked"
};

export const trackSale = async ({
  clickId,
  customerExternalId,
  customerName,
  customerEmail,
  customerAvatar,
  amount,
  currency = "usd",
  eventName,
  paymentProcessor,
  invoiceId,
  leadEventName,
  metadata,
  workspace,
  source = "tracked",
}: TrackSaleParams) => {
  let existingCustomer: Customer | null = null;
  let newCustomer: Customer | null = null;
  let leadEventData: LeadEventTB | null = null;
  let shouldTrackDirectSaleLead = false;

  // Return idempotent response if invoiceId is already processed
  if (invoiceId) {
    const cachedResponse = await redis.get(
      `trackSale:${workspace.id}:invoiceId:${invoiceId}`,
    );
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Find existing customer
  existingCustomer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customerExternalId,
      },
    },
  });

  // Existing customer is found, find the lead event to associate the sale with
  if (existingCustomer) {
    const leadEvent = await getLeadEvent({
      customerId: existingCustomer.id,
      eventName: leadEventName,
    });

    if (!leadEvent) {
      const errorMessage = `Lead event not found for externalId: ${customerExternalId} and leadEventName: ${leadEventName}`;

      throw new DubApiError({
        code: "not_found",
        message: errorMessage,
      });
    }

    leadEventData = {
      ...leadEvent,
      workspace_id: leadEvent.workspace_id || workspace.id, // in case for some reason the lead event doesn't have workspace_id
    };
  }

  // If no existing customer is found and no clickId is provided, return an error
  if (!existingCustomer && !clickId) {
    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  let clickData: ClickEventTB | null = null;

  // Find the click event for the given clickId
  if (clickId) {
    clickData = await getClickEvent({
      clickId,
    });

    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    // For the same customer, a sale event might come from a different link click than the original lead event.
    // We want to attribute the sale to the correct link (the one from the clickId) for direct sale tracking.
    if (leadEventData) {
      leadEventData = {
        ...leadEventData,
        ...clickData,
      };
    }
  }

  // Direct sale tracking: create the customer from the click event.
  // On concurrent requests, fall back to fetching the existing row (P2002) instead of failing.
  if (!existingCustomer && clickData) {
    const link = await prisma.link.findUnique({
      where: {
        id: clickData.link_id,
      },
      select: {
        id: true,
        projectId: true,
        disabledAt: true,
      },
    });

    if (!link) {
      throw new DubApiError({
        code: "not_found",
        message: `Link not found for clickId: ${clickData.click_id}`,
      });
    }

    if (link.projectId !== workspace.id) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${link.id} for clickId ${clickData.click_id} does not belong to the workspace`,
      });
    }

    if (link.disabledAt) {
      throw new DubApiError({
        code: "not_found",
        message: `Link ${link.id} for clickId ${clickData.click_id} is disabled, sale not tracked`,
      });
    }

    const finalCustomerId = createId({ prefix: "cus_" });
    const finalCustomerName =
      customerName || customerEmail || generateRandomName();
    const finalCustomerAvatar =
      customerAvatar && !isStored(customerAvatar)
        ? `${R2_URL}/customers/${finalCustomerId}/avatar_${nanoid(7)}`
        : customerAvatar;

    const { customer: createdOrFoundCustomer, created } =
      await createOrGetCustomer({
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
          linkId: clickData.link_id,
          clickId: clickData.click_id,
          country: clickData.country,
          projectId: workspace.id,
          projectConnectId: workspace.stripeConnectId,
          clickedAt: new Date(clickData.timestamp + "Z"),
        },
      });

    if (created) {
      newCustomer = createdOrFoundCustomer;
    } else {
      existingCustomer = createdOrFoundCustomer;
    }

    // Persist customer avatar to R2 if it's not already stored
    if (customerAvatar && !isStored(customerAvatar) && finalCustomerAvatar) {
      waitUntil(
        storage
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
            if (newCustomer) {
              await prisma.customer.update({
                where: {
                  id: newCustomer.id,
                },
                data: {
                  avatar: null,
                },
              });
            }
          }),
      );
    }

    // if leadEventName is provided, use it
    // otherwise use "Direct sale tracking lead event" (since it's for direct sale tracking)
    const finalLeadEventName =
      leadEventName ?? "Direct sale tracking lead event";

    if (newCustomer) {
      leadEventData = {
        ...clickData,
        event_id: nanoid(16),
        event_name: finalLeadEventName,
        customer_id: newCustomer.id,
        metadata: metadata ? JSON.stringify(metadata) : "",
      };
    } else if (existingCustomer) {
      const leadEvent = await getLeadEvent({
        customerId: existingCustomer.id,
        eventName: leadEventName,
      });

      leadEventData = leadEvent
        ? {
            ...leadEvent,
            ...clickData,
          }
        : {
            ...clickData,
            event_id: nanoid(16),
            event_name: finalLeadEventName,
            customer_id: existingCustomer.id,
            metadata: metadata ? JSON.stringify(metadata) : "",
          };
    }

    // Deduplicate lead events across concurrent direct sale requests
    if (leadEventData) {
      const cacheKey = `directSaleTrackLead:${workspace.id}:${customerExternalId}:${finalLeadEventName.toLowerCase().replaceAll(" ", "-")}`;
      const cachedLeadEvent = await redis.set(
        cacheKey,
        {
          timestamp: Date.now(),
        },
        {
          ex: 30, // 30 seconds
          nx: true,
        },
      );

      shouldTrackDirectSaleLead = cachedLeadEvent !== null;
    }
  }

  const customer = existingCustomer ?? newCustomer;

  // This should never happen, but just in case
  if (!customer) {
    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  const [_, trackedSale] = await Promise.all([
    shouldTrackDirectSaleLead &&
      _trackLead({
        workspace,
        leadEventData,
        customer,
      }),

    _trackSale({
      amount,
      currency,
      eventName,
      paymentProcessor,
      invoiceId,
      metadata,
      workspace,
      leadEventData,
      customer,
      source,
    }),
  ]);

  return trackedSale;
};

// Track the lead event
const _trackLead = async ({
  workspace,
  leadEventData,
  customer,
}: Pick<TrackSaleParams, "workspace"> & {
  leadEventData: LeadEventTB | null;
  customer: Customer;
}) => {
  if (!leadEventData) {
    throw new DubApiError({
      code: "not_found",
      message: `Lead event data not found for the customer ${customer.id}`,
    });
  }

  waitUntil(
    (async () => {
      const [_leadEvent, link, _workspace] = await Promise.all([
        // Record the lead event for the customer
        recordLead({
          ...leadEventData,
          workspace_id: leadEventData.workspace_id || workspace.id, // in case for some reason the lead event doesn't have workspace_id
        }),

        // Update link leads count + lastLeadAt date
        prisma.link.update({
          where: {
            id: leadEventData.link_id,
          },
          data: {
            leads: {
              increment: 1,
            },
            lastLeadAt: new Date(),
          },
          include: includeTags,
        }),

        // Update workspace events usage
        prisma.project.update({
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

      // Create partner commission and execute workflows
      if (link.programId && link.partnerId && customer) {
        await Promise.allSettled([
          executeWorkflows({
            trigger: "partnerMetricsUpdated",
            reason: "lead",
            identity: {
              workspaceId: workspace.id,
              programId: link.programId,
              partnerId: link.partnerId,
            },
            metrics: {
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
        ]);
      }

      await Promise.allSettled([
        sendWorkspaceWebhook({
          trigger: "lead.created",
          data: transformLeadEventData({
            ...leadEventData,
            link,
            customer,
          }),
          workspace,
        }),

        ...(link.partnerId
          ? [
              sendPartnerPostback({
                partnerId: link.partnerId,
                event: "lead.created",
                data: {
                  ...leadEventData,
                  link,
                  customer,
                },
              }),
            ]
          : []),
      ]);
    })(),
  );
};

// Track the sale event
const _trackSale = async ({
  amount,
  currency = "usd",
  eventName,
  paymentProcessor,
  invoiceId,
  metadata,
  workspace,
  leadEventData,
  customer,
  source,
}: Omit<TrackSaleParams, "customerExternalId"> & {
  leadEventData: LeadEventTB | null;
  customer: Customer;
}) => {
  if (!leadEventData) {
    throw new DubApiError({
      code: "not_found",
      message: `Lead event data not found for the customer ${customer.id}`,
    });
  }

  // Skip if amount is 0 or less
  if (amount <= 0) {
    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  // if currency is not USD, convert it to USD based on the current FX rate
  // TODO: allow custom "defaultCurrency" on workspace table in the future
  if (currency !== "usd") {
    const { currency: convertedCurrency, amount: convertedAmount } =
      await convertCurrency({
        currency,
        amount,
      });

    currency = convertedCurrency;
    amount = convertedAmount;
  }

  const saleData = {
    ...leadEventData,
    workspace_id: leadEventData.workspace_id || workspace.id, // in case for some reason the lead event doesn't have workspace_id
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
    payment_processor: paymentProcessor,
    amount,
    currency,
    invoice_id: invoiceId || "",
    metadata: metadata ? JSON.stringify(metadata) : "",
  };

  let firstConversionFlag = isFirstConversion({
    customer,
    linkId: saleData.link_id,
  });

  // Deduplicate concurrent first sales for the same customer + link so only one
  // request is counted as the first conversion.
  if (firstConversionFlag) {
    const claim = await redis.set(
      `firstConversion:${customer.id}:${saleData.link_id}`,
      1,
      {
        ex: 30,
        nx: true,
      },
    );

    firstConversionFlag = claim !== null;
  }

  waitUntil(
    (async () => {
      // Update link conversions, sales, and saleAmount
      const link = await prisma.link.update({
        where: {
          id: saleData.link_id,
        },
        data: {
          ...(firstConversionFlag && {
            conversions: {
              increment: 1,
            },
            lastConversionAt: new Date(),
          }),
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: amount,
          },
        },
        include: includeTags,
      });

      let result:
        | Awaited<ReturnType<typeof queuePartnerCommissionCreation>>
        | undefined = undefined;

      if (link.programId && link.partnerId) {
        result = await queuePartnerCommissionCreation({
          event: "sale",
          programId: link.programId,
          partnerId: link.partnerId,
          linkId: link.id,
          customerId: customer.id,
          eventId: saleData.event_id,
          amount: saleData.amount,
          quantity: 1,
          invoiceId,
          currency,
          context: {
            customer: {
              country: customer.country,
              signupDate: customer.createdAt,
              source,
            },
            sale: {
              productId: metadata?.productId,
              amount: saleData.amount,
              ...(metadata != null && { metadata }),
            },
          },
          clickEvent: {
            url: saleData.url,
            referer: saleData.referer,
          },
          isFirstConversion: firstConversionFlag,
        });

        await Promise.allSettled([
          executeWorkflows({
            trigger: "partnerMetricsUpdated",
            reason: "sale",
            identity: {
              workspaceId: workspace.id,
              programId: link.programId,
              partnerId: link.partnerId,
              customerId: customer.id,
              customerFirstSaleAt: customer.firstSaleAt ?? new Date(),
            },
            metrics: {
              current: {
                conversions: firstConversionFlag ? 1 : 0,
                saleAmount: saleData.amount,
              },
            },
          }),

          syncPartnerLinksStats({
            partnerId: link.partnerId,
            programId: link.programId,
            eventType: "sale",
          }),
        ]);
      }

      await Promise.allSettled([
        recordSale({
          ...saleData,
          timestamp: undefined,
        }),

        sendWorkspaceWebhook({
          trigger: "sale.created",
          data: transformSaleEventData({
            ...saleData,
            clickedAt: customer.clickedAt || customer.createdAt,
            link,
            customer,
            partner: result?.webhookPartner,
            metadata,
          }),
          workspace,
        }),

        ...(link.partnerId
          ? [
              sendPartnerPostback({
                partnerId: link.partnerId,
                event: "sale.created",
                data: {
                  ...saleData,
                  clickedAt: customer.clickedAt || customer.createdAt,
                  link,
                  customer,
                },
              }),
            ]
          : []),

        publishWorkspaceClicksUsageEvent({
          linkId: link.id,
          workspaceId: workspace.id,
          timestamp: new Date().toISOString(),
        }),
      ]);

      // Update customer stats + program/partner associations
      await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          ...(link.programId && {
            programId: link.programId,
          }),
          ...(link.partnerId && {
            partnerId: link.partnerId,
          }),
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: amount,
          },
          firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
        },
      });
    })(),
  );

  const trackSaleResponse = trackSaleResponseSchema.parse({
    eventName,
    customer,
    sale: {
      amount,
      currency,
      invoiceId,
      paymentProcessor,
      metadata,
    },
  });

  if (invoiceId) {
    waitUntil(
      redis.set(
        `trackSale:${workspace.id}:invoiceId:${invoiceId}`,
        trackSaleResponse,
        {
          ex: 60 * 60 * 24 * 7, // cache for 1 week
        },
      ),
    );
  }

  return trackSaleResponse;
};
