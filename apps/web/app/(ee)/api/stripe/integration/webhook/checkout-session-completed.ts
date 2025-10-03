import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { generateRandomName } from "@/lib/names";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import {
  getClickEvent,
  getLeadEvent,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { ClickEventTB, LeadEventTB, WebhookPartner } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  transformLeadEventData,
  transformSaleEventData,
} from "@/lib/webhook/transform";
import { prisma } from "@dub/prisma";
import { Customer, WorkflowTrigger } from "@dub/prisma/client";
import { COUNTRIES_TO_CONTINENTS, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import {
  getConnectedCustomer,
  getPromotionCode,
  getSubscriptionProductId,
  updateCustomerWithStripeCustomerId,
} from "./utils";

// Handle event "checkout.session.completed"
export async function checkoutSessionCompleted(event: Stripe.Event) {
  let charge = event.data.object as Stripe.Checkout.Session;
  let dubCustomerId = charge.metadata?.dubCustomerId;
  const clientReferenceId = charge.client_reference_id;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;
  const stripeCustomerName = charge.customer_details?.name;
  const stripeCustomerEmail = charge.customer_details?.email;
  const invoiceId = charge.invoice as string;
  const promotionCodeId = charge.discounts?.[0]?.promotion_code as string;

  let customer: Customer | null = null;
  let existingCustomer: Customer | null = null;
  let clickEvent: ClickEventTB | null = null;
  let leadEvent: LeadEventTB;
  let linkId: string;
  let shouldSendLeadWebhook = true;

  /*
      for stripe checkout links:
      - if client_reference_id is a dub_id, we find the click event
      - the click event will be used to create a lead event + customer
      - the lead event will then be passed to the remaining logic to record a sale
    */
  if (clientReferenceId?.startsWith("dub_id_")) {
    const dubClickId = clientReferenceId.split("dub_id_")[1];

    clickEvent = await getClickEvent({ clickId: dubClickId }).then(
      (res) => res.data[0],
    );

    if (!clickEvent) {
      return `Click event with dub_id ${dubClickId} not found, skipping...`;
    }

    const workspace = await prisma.project.findUnique({
      where: {
        stripeConnectId: stripeAccountId,
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      return `Workspace with stripeConnectId ${stripeAccountId} not found, skipping...`;
    }

    existingCustomer = await prisma.customer.findFirst({
      where: {
        projectId: workspace.id,
        // check for existing customer with the same externalId (via clickId or email)
        // TODO: should we support checks for email and stripeCustomerId too?
        OR: [
          {
            externalId: clickEvent.click_id,
          },
          {
            externalId: stripeCustomerEmail,
          },
        ],
      },
    });

    const payload = {
      name: stripeCustomerName,
      email: stripeCustomerEmail,
      // stripeCustomerId can potentially be null, so we use email as fallback
      externalId: stripeCustomerId || stripeCustomerEmail,
      projectId: workspace.id,
      projectConnectId: stripeAccountId,
      stripeCustomerId,
      clickId: clickEvent.click_id,
      linkId: clickEvent.link_id,
      country: clickEvent.country,
      clickedAt: new Date(clickEvent.timestamp + "Z"),
    };

    if (existingCustomer) {
      customer = await prisma.customer.update({
        where: {
          id: existingCustomer.id,
        },
        data: payload,
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          id: createId({ prefix: "cus_" }),
          ...payload,
        },
      });
    }

    // remove timestamp from clickEvent
    const { timestamp, ...rest } = clickEvent;
    leadEvent = {
      ...rest,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customer.id,
      metadata: "",
    };

    if (!existingCustomer) {
      await recordLead(leadEvent);
    }

    linkId = clickEvent.link_id;
  } else if (stripeCustomerId) {
    /*
    for regular stripe checkout setup (provided stripeCustomerId is present):
    - if dubCustomerId is provided:
      - we update the customer with the stripe customerId (for future events)
    - else:
      - we first try to see if the customer with the Stripe ID already exists in Dub
        - if it does, great, we can use the customer found on Dub
      - if it doesn't, we try to find the customer on the connected account
      - if present:
          - we update the customer with the stripe customerId
          - we then find the lead event using the customer's unique ID on Dub
          - the lead event will then be passed to the remaining logic to record a sale
      - if not present, we skip the event
  */
    if (dubCustomerId) {
      customer = await updateCustomerWithStripeCustomerId({
        stripeAccountId,
        dubCustomerId,
        stripeCustomerId,
      });

      if (!customer) {
        return `dubCustomerId was provided but customer with dubCustomerId ${dubCustomerId} not found on Dub, skipping...`;
      }
    } else {
      existingCustomer = await prisma.customer.findUnique({
        where: {
          stripeCustomerId,
        },
      });

      if (existingCustomer) {
        dubCustomerId = existingCustomer.externalId ?? stripeCustomerId;
        customer = existingCustomer;
      } else {
        const connectedCustomer = await getConnectedCustomer({
          stripeCustomerId,
          stripeAccountId,
          livemode: event.livemode,
        });

        if (!connectedCustomer || !connectedCustomer.metadata.dubCustomerId) {
          return `dubCustomerId not found in Stripe checkout session metadata (nor is it available in Dub, or on the connected customer ${stripeCustomerId}) and client_reference_id is not a dub_id, skipping...`;
        }

        dubCustomerId = connectedCustomer.metadata.dubCustomerId;
        customer = await updateCustomerWithStripeCustomerId({
          stripeAccountId,
          dubCustomerId,
          stripeCustomerId,
        });
        if (!customer) {
          return `dubCustomerId was found on the connected customer ${stripeCustomerId} but customer with dubCustomerId ${dubCustomerId} not found on Dub, skipping...`;
        }
      }
    }

    // Find lead
    leadEvent = await getLeadEvent({ customerId: customer.id }).then(
      (res) => res.data[0],
    );

    linkId = leadEvent.link_id;
  } else if (promotionCodeId) {
    // Find the promotion code for the promotion code id
    const promotionCode = await getPromotionCode({
      promotionCodeId,
      stripeAccountId,
      livemode: event.livemode,
    });

    if (!promotionCode) {
      return `Promotion code ${promotionCodeId} not found in connected account ${stripeAccountId}, skipping...`;
    }

    // Find the workspace
    const workspace = await prisma.project.findUnique({
      where: {
        stripeConnectId: stripeAccountId,
      },
      select: {
        id: true,
        stripeConnectId: true,
        defaultProgramId: true,
      },
    });

    if (!workspace) {
      return `Workspace with stripeConnectId ${stripeAccountId} not found, skipping...`;
    }

    if (!workspace.defaultProgramId) {
      return `Workspace with stripeConnectId ${stripeAccountId} has no default program, skipping...`;
    }

    const discountCode = await prisma.discountCode.findUnique({
      where: {
        programId_code: {
          programId: workspace.defaultProgramId,
          code: promotionCode.code,
        },
      },
      select: {
        link: true,
      },
    });

    if (!discountCode) {
      return `Couldn't find link associated with promotion code ${promotionCode.code}, skipping...`;
    }

    const link = discountCode.link;
    linkId = link.id;

    // Record a fake click for this event
    const customerDetails = charge.customer_details;
    const customerAddress = customerDetails?.address;

    clickEvent = await recordFakeClick({
      link,
      customer: {
        continent: customerAddress?.country
          ? COUNTRIES_TO_CONTINENTS[customerAddress.country]
          : "NA",
        country: customerAddress?.country ?? "US",
        region: customerAddress?.state ?? "CA",
      },
    });

    customer = await prisma.customer.create({
      data: {
        id: createId({ prefix: "cus_" }),
        name:
          customerDetails?.name ||
          customerDetails?.email ||
          generateRandomName(),
        email: customerDetails?.email,
        externalId: clickEvent.click_id,
        linkId: clickEvent.link_id,
        clickId: clickEvent.click_id,
        clickedAt: new Date(clickEvent.timestamp + "Z"),
        country: customerAddress?.country,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
    });

    // Prepare the payload for the lead event
    const { timestamp, ...rest } = clickEvent;

    leadEvent = {
      ...rest,
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customer.id,
      metadata: "",
    };

    shouldSendLeadWebhook = false;
  } else {
    return "No dubCustomerId or stripeCustomerId found in Stripe checkout session metadata, skipping...";
  }

  if (charge.amount_total === 0) {
    return `Checkout session completed for Stripe customer ${stripeCustomerId} with invoice ID ${invoiceId} but amount is 0, skipping...`;
  }

  if (charge.mode === "setup") {
    return `Checkout session completed for Stripe customer ${stripeCustomerId} but mode is setup, skipping...`;
  }

  if (invoiceId) {
    // Skip if invoice id is already processed
    const ok = await redis.set(
      `trackSale:stripe:invoiceId:${invoiceId}`, // here we assume that Stripe's invoice ID is unique across all customers
      {
        timestamp: new Date().toISOString(),
        dubCustomerId,
        stripeCustomerId,
        stripeAccountId,
        invoiceId,
        customerId: customer.id,
        workspaceId: customer.projectId,
        amount: charge.amount_total,
        currency: charge.currency,
      },
      {
        ex: 60 * 60 * 24 * 7,
        nx: true,
      },
    );

    if (!ok) {
      console.info(
        "[Stripe Webhook] Skipping already processed invoice.",
        invoiceId,
      );
      return `Invoice with ID ${invoiceId} already processed, skipping...`;
    }
  }

  if (charge.currency && charge.currency !== "usd" && charge.amount_total) {
    // support for Stripe Adaptive Pricing: https://docs.stripe.com/payments/checkout/adaptive-pricing
    if (charge.currency_conversion) {
      charge.currency = charge.currency_conversion.source_currency;
      charge.amount_total = charge.currency_conversion.amount_total;

      // if Stripe Adaptive Pricing is not enabled, we convert the amount to USD based on the current FX rate
      // TODO: allow custom "defaultCurrency" on workspace table in the future
    } else {
      const { currency: convertedCurrency, amount: convertedAmount } =
        await convertCurrency({
          currency: charge.currency,
          amount: charge.amount_total,
        });

      charge.currency = convertedCurrency;
      charge.amount_total = convertedAmount;
    }
  }

  const saleData = {
    ...leadEvent,
    event_id: nanoid(16),
    // if the charge is a one-time payment, we set the event name to "Purchase"
    event_name:
      charge.mode === "payment" ? "Purchase" : "Subscription creation",
    payment_processor: "stripe",
    amount: charge.amount_total!,
    currency: charge.currency!,
    invoice_id: invoiceId || "",
    metadata: JSON.stringify({
      charge,
    }),
  };

  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  const firstConversionFlag = isFirstConversion({
    customer,
    linkId,
  });

  const [_sale, linkUpdated, workspace] = await Promise.all([
    recordSale(saleData),

    // update link stats
    link &&
      prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          // if the clickEvent variable exists, it means that a new lead was created
          ...(clickEvent && {
            leads: {
              increment: 1,
            },
            lastLeadAt: new Date(),
          }),
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
            increment: charge.amount_total!,
          },
        },
        include: includeTags,
      }),

    // update workspace sales usage
    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: clickEvent ? 2 : 1,
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
          increment: charge.amount_total!,
        },
      },
    }),
  ]);

  // for program links
  let webhookPartner: WebhookPartner | undefined;
  if (link && link.programId && link.partnerId) {
    const productId = await getSubscriptionProductId({
      stripeSubscriptionId: charge.subscription as string,
      stripeAccountId,
      livemode: event.livemode,
    });

    const createdCommission = await createPartnerCommission({
      event: "sale",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId: saleData.event_id,
      customerId: customer.id,
      amount: saleData.amount,
      quantity: 1,
      invoiceId,
      currency: saleData.currency,
      context: {
        customer: {
          country: customer.country,
        },
        sale: {
          productId,
          amount: saleData.amount,
        },
      },
    });
    webhookPartner = createdCommission?.webhookPartner;

    waitUntil(
      Promise.allSettled([
        executeWorkflows({
          trigger: WorkflowTrigger.saleRecorded,
          context: {
            programId: link.programId,
            partnerId: link.partnerId,
            current: {
              saleAmount: saleData.amount,
              conversions: firstConversionFlag ? 1 : 0,
            },
          },
        }),
        // same logic as lead.created webhook below:
        // if the clickEvent variable exists and there was no existing customer before,
        // we need to trigger the leadRecorded workflow
        clickEvent &&
          !existingCustomer &&
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
      ]),
    );
  }

  waitUntil(
    (async () => {
      // if the clickEvent variable exists and there was no existing customer before,
      // we send a lead.created webhook
      if (clickEvent && !existingCustomer && shouldSendLeadWebhook) {
        await sendWorkspaceWebhook({
          trigger: "lead.created",
          workspace,
          data: transformLeadEventData({
            ...clickEvent,
            eventName: "Checkout session completed",
            link: linkUpdated,
            customer,
            partner: webhookPartner,
            metadata: null,
          }),
        });
      }

      // send workspace webhook
      await sendWorkspaceWebhook({
        trigger: "sale.created",
        workspace,
        data: transformSaleEventData({
          ...saleData,
          clickedAt: customer.clickedAt || customer.createdAt,
          link: linkUpdated,
          customer,
          partner: webhookPartner,
          metadata: null,
        }),
      });
    })(),
  );

  return `Checkout session completed for customer with external ID ${dubCustomerId} and invoice ID ${invoiceId}`;
}
