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
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
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
import { trackLead } from "./track-lead";

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
  if (invoiceId) {
    // skip if invoice id is already processed
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

  // find customer
  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customerExternalId,
      },
    },
  });

  if (!customer && !clickId) {
    waitUntil(
      logConversionEvent({
        workspace_id: workspace.id,
        path: "/track/sale",
        body: JSON.stringify(rawBody),
        error: `Customer not found for externalId: ${customerExternalId}`,
      }),
    );

    return {
      eventName,
      customer: null,
      sale: null,
    };
  }

  // find click event if clickId is provided
  let clickData: ClickEventTB | null = null;

  if (clickId) {
    const clickEvent = await getClickEvent({
      clickId,
    });

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

    if (!clickData) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }
  }

  // find lead event if customer exists
  if (customer) {
    let leadEventData: LeadEventTB | null = null;

    const leadEvent = await getLeadEvent({
      customerId: customer.id,
      eventName: leadEventName,
    });

    if (!leadEvent || leadEvent.data.length === 0) {
      // Check cache to see if the lead event exists
      // if leadEventName is provided, we only check for that specific event
      // otherwise, we check for all cached lead events for that customer

      const cachedLeadEvent = await redis.get<LeadEventTB>(
        `leadCache:${customer.id}${leadEventName ? `:${leadEventName.toLowerCase().replaceAll(" ", "-")}` : ""}`,
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

    clickData = clickEventSchemaTB.parse(leadEventData);
  }

  await Promise.all([
    // _trackLead({
    //   customerExternalId,
    //   customerName,
    //   customerEmail,
    //   customerAvatar,
    //   workspace,
    //   clickData,
    // }),

    // trackLead({
    //   clickId,
    //   customerExternalId,
    //   customerName,
    //   customerEmail,
    //   customerAvatar,
    //   eventName: "Sign Up",
    //   eventQuantity: 1,
    //   metadata: null,
    //   rawBody,
    //   workspace,
    // })

    _trackSale({
      amount,
      currency,
      eventName,
      paymentProcessor,
      invoiceId,
      metadata,
      rawBody,
      workspace,
      clickData,
      customer,
    }),
  ]);
};

const _trackLead = async ({
  customerExternalId,
  customerName,
  customerEmail,
  customerAvatar,
  workspace,
  clickData,
}: Pick<
  TrackSaleParams,
  | "clickId"
  | "customerExternalId"
  | "customerName"
  | "customerEmail"
  | "customerAvatar"
  | "workspace"
> & {
  clickData: ClickEventTB | null;
}) => {
  if (!clickData) {
    return;
  }

  // get the referral link from the from the clickData
  const linkFound = await prisma.link.findUnique({
    where: {
      id: clickData.link_id,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!linkFound) {
    throw new DubApiError({
      code: "not_found",
      message: `Link not found for clickId: ${clickData.click_id}`,
    });
  }

  if (linkFound.projectId !== workspace.id) {
    throw new DubApiError({
      code: "not_found",
      message: `Link for clickId ${clickData.click_id} does not belong to the workspace`,
    });
  }

  // prepare the customer data
  const eventQuantity = 1;
  const finalCustomerId = createId({ prefix: "cus_" });
  const finalCustomerName =
    customerName || customerEmail || generateRandomName();
  const finalCustomerAvatar =
    customerAvatar && !isStored(customerAvatar)
      ? `${R2_URL}/customers/${finalCustomerId}/avatar_${nanoid(7)}`
      : customerAvatar;

  // construct the lead event payload
  const leadEventId = nanoid(16);
  const leadEventName = "Sign up";

  // create a new customer
  const customer = await prisma.customer.create({
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

  const [_leadEvent, link, _workspace] = await Promise.all([
    // record the lead event for the customer
    recordLead({
      ...clickData,
      event_id: leadEventId,
      event_name: leadEventName,
      customer_id: finalCustomerId,
    }),

    // update link leads count
    prisma.link.update({
      where: {
        id: clickData.link_id,
      },
      data: {
        leads: {
          increment: eventQuantity,
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
          increment: eventQuantity,
        },
      },
    }),

    // persist customer avatar to R2
    customerAvatar &&
      !isStored(customerAvatar) &&
      finalCustomerAvatar &&
      storage.upload(
        finalCustomerAvatar.replace(`${R2_URL}/`, ""),
        customerAvatar,
        {
          width: 128,
          height: 128,
        },
      ),
  ]);

  // create partner commission and execute workflows
  if (link.programId && link.partnerId && customer) {
    await createPartnerCommission({
      event: "lead",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId: leadEventId,
      customerId: customer.id,
      quantity: eventQuantity,
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

  // send workspace webhook
  const webhookPayload = transformLeadEventData({
    ...clickData,
    eventName: leadEventName,
    link,
    customer,
  });

  await sendWorkspaceWebhook({
    trigger: "lead.created",
    data: webhookPayload,
    workspace,
  });
};

const _trackSale = async ({
  amount,
  currency = "usd",
  eventName,
  paymentProcessor,
  invoiceId,
  metadata,
  rawBody,
  workspace,
  clickData,
  customer,
}: TrackSaleParams & {
  clickData: ClickEventTB | null;
  customer: Pick<
    Customer,
    "id" | "sales" | "linkId" | "country" | "clickedAt" | "createdAt"
  >;
}) => {
  if (!clickData) {
    return;
  }

  // if currency is not USD, convert it to USD  based on the current FX rate
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

  waitUntil(
    (async () => {
      const saleEvent = {
        ...clickData,
        event_id: nanoid(16),
        event_name: eventName,
        customer_id: customer.id,
        payment_processor: paymentProcessor,
        amount,
        currency,
        invoice_id: invoiceId || "",
        metadata: metadata ? JSON.stringify(metadata) : "",
      };

      const [_sale, link] = await Promise.all([
        // record sale event
        recordSale(saleEvent),

        // update link conversions, sales, and saleAmount
        prisma.link.update({
          where: {
            id: saleEvent.link_id,
          },
          data: {
            ...(isFirstConversion({
              customer,
              linkId: saleEvent.link_id,
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

        // update workspace events usage
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

        // update customer sales count
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

        logConversionEvent({
          workspace_id: workspace.id,
          link_id: saleEvent.link_id,
          path: "/track/sale",
          body: JSON.stringify(rawBody),
        }),
      ]);

      // create partner commission and execute workflows
      if (link.programId && link.partnerId) {
        await createPartnerCommission({
          event: "sale",
          programId: link.programId,
          partnerId: link.partnerId,
          linkId: link.id,
          customerId: customer.id,
          eventId: saleEvent.event_id,
          amount: saleEvent.amount,
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

      // send workspace webhook
      const webhookPayload = transformSaleEventData({
        ...saleEvent,
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
