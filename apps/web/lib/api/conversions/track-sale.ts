import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { isStored, storage } from "@/lib/storage";
import {
  getClickEvent,
  getLeadEvent,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import { logConversionEvent } from "@/lib/tinybird/log-conversion-events";
import { ClickEventTB, LeadEventTB, WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  transformLeadEventData,
  transformSaleEventData,
} from "@/lib/webhook/transform";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { Customer, WorkflowTrigger } from "@dub/prisma/client";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createId } from "../create-id";
import { executeWorkflows } from "../workflows/execute-workflows";

type TrackSaleParams = z.input<typeof trackSaleRequestSchema> & {
  rawBody: any;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
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
  rawBody,
  workspace,
}: TrackSaleParams) => {
  let existingCustomer: Customer | null = null;
  let newCustomer: Customer | null = null;
  let clickData: ClickEventTB | null = null;
  let leadEventData: LeadEventTB | null = null;

  // Skip if invoice id is already processed
  if (invoiceId) {
    const ok = await redis.set(`dub_sale_events:invoiceId:${invoiceId}`, 1, {
      ex: 60 * 60 * 24 * 7,
      nx: true,
    });

    if (!ok) {
      return {
        eventName,
        customer: null,
        sale: null,
      };
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

    if (!leadEvent || leadEvent.data.length === 0) {
      // Check cache to see if the lead event exists
      // if leadEventName is provided, we only check for that specific event
      // otherwise, we check for all cached lead events for that customer

      const cachedLeadEvent = await redis.get<LeadEventTB>(
        `leadCache:${existingCustomer.id}${leadEventName ? `:${leadEventName.toLowerCase().replaceAll(" ", "-")}` : ""}`,
      );

      if (!cachedLeadEvent) {
        const errorMessage = `Lead event not found for externalId: ${customerExternalId} and leadEventName: ${leadEventName}`;

        waitUntil(
          logConversionEvent({
            workspace_id: workspace.id,
            path: "/track/sale",
            body: JSON.stringify(rawBody),
            error: errorMessage,
          }),
        );

        throw new DubApiError({
          code: "not_found",
          message: errorMessage,
        });
      }

      leadEventData = cachedLeadEvent;
    } else {
      leadEventData = leadEvent.data[0];
    }
  }

  // No existing customer is found, find the click event and create a new customer (for sale tracking without a pre-existing lead event)
  else {
    if (!clickId) {
      waitUntil(
        logConversionEvent({
          workspace_id: workspace.id,
          path: "/track/sale",
          body: JSON.stringify(rawBody),
          error: `No existing customer with the provided customerExternalId (${customerExternalId}) was found, and there was no clickId provided for sale tracking without a pre-existing lead event.`,
        }),
      );

      return {
        eventName,
        customer: null,
        sale: null,
      };
    }

    // Find the click event for the given clickId
    const clickEvent = await getClickEvent({
      clickId,
    });

    if (clickEvent && clickEvent.data && clickEvent.data.length > 0) {
      clickData = clickEvent.data[0];
    }

    // If there is no click data in Tinybird yet, check the clickIdCache
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

    // Create a new customer
    const link = await prisma.link.findUnique({
      where: {
        id: clickData.link_id,
      },
      select: {
        id: true,
        projectId: true,
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
        message: `Link for clickId ${clickData.click_id} does not belong to the workspace`,
      });
    }

    const finalCustomerId = createId({ prefix: "cus_" });
    const finalCustomerName =
      customerName || customerEmail || generateRandomName();
    const finalCustomerAvatar =
      customerAvatar && !isStored(customerAvatar)
        ? `${R2_URL}/customers/${finalCustomerId}/avatar_${nanoid(7)}`
        : customerAvatar;

    newCustomer = await prisma.customer.create({
      data: {
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

    if (customerAvatar && !isStored(customerAvatar) && finalCustomerAvatar) {
      // persist customer avatar to R2 if it's not already stored
      waitUntil(
        storage.upload(
          finalCustomerAvatar.replace(`${R2_URL}/`, ""),
          customerAvatar,
          {
            width: 128,
            height: 128,
          },
        ),
      );
    }

    leadEventData = {
      ...clickData,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: newCustomer.id,
      metadata: metadata ? JSON.stringify(metadata) : "",
    };
  }

  const customer = existingCustomer ?? newCustomer;

  // This should never happen, but just in case
  if (!customer) {
    waitUntil(
      logConversionEvent({
        workspace_id: workspace.id,
        path: "/track/sale",
        body: JSON.stringify(rawBody),
        error: `Customer not found for customerExternalId: ${customerExternalId}`,
      }),
    );

    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  const [_, trackedSale] = await Promise.all([
    newCustomer &&
      _trackLead({
        workspace,
        leadEventData,
        customer: newCustomer,
      }),

    _trackSale({
      amount,
      currency,
      eventName,
      paymentProcessor,
      invoiceId,
      metadata,
      rawBody,
      workspace,
      leadEventData,
      customer,
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
        recordLead(leadEventData),

        // Update link leads count
        prisma.link.update({
          where: {
            id: leadEventData.link_id,
          },
          data: {
            leads: {
              increment: 1,
            },
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
        await createPartnerCommission({
          event: "lead",
          programId: link.programId,
          partnerId: link.partnerId,
          linkId: link.id,
          eventId: leadEventData.event_id,
          customerId: customer.id,
          quantity: 1,
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

      // Send workspace webhook
      const webhookPayload = transformLeadEventData({
        ...leadEventData,
        link,
        customer,
      });

      await sendWorkspaceWebhook({
        trigger: "lead.created",
        data: webhookPayload,
        workspace,
      });
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
  rawBody,
  workspace,
  leadEventData,
  customer,
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
    event_id: nanoid(16),
    event_name: eventName,
    customer_id: customer.id,
    payment_processor: paymentProcessor,
    amount,
    currency,
    invoice_id: invoiceId || "",
    metadata: metadata ? JSON.stringify(metadata) : "",
    timestamp: undefined,
  };

  waitUntil(
    (async () => {
      const [_sale, link] = await Promise.all([
        // Record sale event
        recordSale(saleData),

        // Update link conversions, sales, and saleAmount
        prisma.link.update({
          where: {
            id: saleData.link_id,
          },
          data: {
            ...(isFirstConversion({
              customer,
              linkId: saleData.link_id,
            }) && {
              conversions: {
                increment: 1,
              },
            }),
            sales: {
              increment: 1,
            },
            saleAmount: {
              increment: amount,
            },
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

        // Update customer sales count
        prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            sales: {
              increment: 1,
            },
            saleAmount: {
              increment: amount,
            },
          },
        }),

        // Log conversion event
        logConversionEvent({
          workspace_id: workspace.id,
          link_id: saleData.link_id,
          path: "/track/sale",
          body: JSON.stringify(rawBody),
        }),
      ]);

      // Create partner commission and execute workflows
      if (link.programId && link.partnerId) {
        await createPartnerCommission({
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
            },
            sale: {
              productId: metadata?.productId as string,
            },
          },
        });

        await executeWorkflows({
          trigger: WorkflowTrigger.saleRecorded,
          programId: link.programId,
          partnerId: link.partnerId,
        });
      }

      // Send workspace webhook
      const webhookPayload = transformSaleEventData({
        ...saleData,
        clickedAt: customer.clickedAt || customer.createdAt,
        link,
        customer,
      });

      await sendWorkspaceWebhook({
        trigger: "sale.created",
        data: webhookPayload,
        workspace,
      });
    })(),
  );

  return trackSaleResponseSchema.parse({
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
};
