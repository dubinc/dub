import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import {
  getClickEvent,
  getLeadEvent,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import { ClickEventTB, LeadEventTB, StripeMode } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { nanoid } from "@dub/utils";
import { Customer } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { attributeViaPromotionCodeId } from "./utils/attribute-via-promotion-code-id";
import { getCheckoutSessionProducts } from "./utils/get-checkout-session-products";
import { getConnectedCustomer } from "./utils/get-connected-customer";
import { incrementLinkLeads } from "./utils/increment-link-leads";
import { updateCustomerWithStripeCustomerId } from "./utils/update-customer-with-stripe-customer-id";

// Handle event "checkout.session.completed"
export async function checkoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
  mode: StripeMode,
) {
  let charge = event.data.object;
  let dubCustomerExternalId =
    charge.metadata?.dubCustomerExternalId || charge.metadata?.dubCustomerId;
  const clientReferenceId = charge.client_reference_id;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = charge.customer as string;
  const stripeCustomerName = charge.customer_details?.name;
  const stripeCustomerEmail = charge.customer_details?.email;
  const invoiceId = charge.invoice as string;
  const promotionCodeId = charge.discounts?.[0]?.promotion_code as
    | string
    | null
    | undefined;

  let customer: Customer | null = null;
  let existingCustomer: Customer | null = null;
  let clickEvent: ClickEventTB | null = null;
  let leadEvent: LeadEventTB | undefined;
  let linkId: string | undefined;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      defaultProgramId: true,
      webhookEnabled: true,
    },
  });

  if (!workspace) {
    return {
      response: `Workspace not found for Stripe account ${stripeAccountId}, skipping...`,
    };
  }

  /*
      for stripe checkout links:
      - if client_reference_id is a dub_id, we find the click event
      - the click event will be used to create a lead event + customer
      - the lead event will then be passed to the remaining logic to record a sale
    */
  if (clientReferenceId?.startsWith("dub_id_")) {
    const dubClickId = clientReferenceId.split("dub_id_")[1];

    clickEvent = await getClickEvent({ clickId: dubClickId });

    if (!clickEvent) {
      return {
        response: `Click event with dub_id ${dubClickId} not found, skipping...`,
        workspaceId: workspace.id,
      };
    }

    existingCustomer = await prisma.customer.findFirst({
      where: {
        projectId: workspace.id,
        // check for existing customer with the same externalId (via clickId or email)
        OR: [
          {
            externalId: clickEvent.click_id,
          },
          ...(stripeCustomerEmail
            ? [
                {
                  externalId: stripeCustomerEmail,
                },
              ]
            : []),
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
      workspace_id: clickEvent.workspace_id || customer.projectId, // in case for some reason the click event doesn't have workspace_id
      event_id: nanoid(16),
      event_name: "Sign up",
      customer_id: customer.id,
      metadata: "",
    };

    if (!existingCustomer) {
      await recordLead(leadEvent);
      waitUntil(incrementLinkLeads(clickEvent.link_id));
    }

    linkId = clickEvent.link_id;
  } else if (stripeCustomerId) {
    /*
    for regular stripe checkout setup (provided stripeCustomerId is present):
    - if dubCustomerExternalId is provided:
      - we try to update the customer with the stripe customerId (for future events)
       if the customer is not found, we check if a promotion code was used in the checkout:
        - if yes, follow the promotion code logic below
        - if no, we skip the event
    - else:
      - we first try to see if the customer with the Stripe ID already exists in Dub
        - if it does, great, we can use the customer found on Dub
      - if it doesn't, we try to find the customer on the connected account
      - if present:
          - we update the customer with the stripe customerId
          - we then find the lead event using the customer's unique ID on Dub
          - the lead event will then be passed to the remaining logic to record a sale
      - if not present:
          - we check if a promotion code was used in the checkout
          - if a promotion code is present, we try to attribute via the promotion code:
            - confirm the promotion code exists in Stripe
            - find the associated discount code and link in Dub
            - record a fake click event for attribution
            - create a new customer and lead event
            - proceed with sale recording
          - if no promotion code or attribution fails, we skip the event
  */
    if (dubCustomerExternalId) {
      customer = await updateCustomerWithStripeCustomerId({
        stripeAccountId,
        dubCustomerExternalId,
        stripeCustomerId,
      });

      if (!customer) {
        if (promotionCodeId) {
          const promoCodeResponse = await attributeViaPromotionCodeId({
            promotionCodeId,
            stripeAccountId,
            workspace,
            mode,
            stripeCustomerId,
            customerDetails: {
              name: charge.customer_details?.name,
              email: charge.customer_details?.email,
              address: charge.customer_details?.address,
            },
          });
          if (promoCodeResponse) {
            ({ linkId, customer, clickEvent, leadEvent } = promoCodeResponse);
          } else {
            return {
              response: `Failed to attribute via promotion code ${promotionCodeId}, skipping...`,
              workspaceId: workspace.id,
            };
          }
        } else {
          return {
            response: `dubCustomerExternalId was provided but customer with dubCustomerExternalId ${dubCustomerExternalId} not found on Dub, skipping...`,
            workspaceId: workspace.id,
          };
        }
      }
    } else {
      // find customer by stripeCustomerId or email
      existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            {
              stripeCustomerId,
            },
            ...(stripeCustomerEmail
              ? [
                  {
                    projectId: workspace.id,
                    email: stripeCustomerEmail,
                  },
                ]
              : []),
          ],
        },
      });

      if (existingCustomer) {
        dubCustomerExternalId = existingCustomer.externalId ?? stripeCustomerId;
        customer = existingCustomer;
      } else {
        const connectedCustomer = await getConnectedCustomer({
          stripeCustomerId,
          stripeAccountId,
          mode,
        });

        const connectedCustomerDubCustomerExternalId =
          connectedCustomer?.metadata.dubCustomerExternalId ||
          connectedCustomer?.metadata.dubCustomerId;

        if (connectedCustomerDubCustomerExternalId) {
          dubCustomerExternalId = connectedCustomerDubCustomerExternalId;
          customer = await updateCustomerWithStripeCustomerId({
            stripeAccountId,
            dubCustomerExternalId,
            stripeCustomerId,
          });
          if (!customer) {
            return {
              response: `dubCustomerExternalId was found on the connected customer ${stripeCustomerId} but customer with dubCustomerExternalId ${dubCustomerExternalId} not found on Dub, skipping...`,
              workspaceId: workspace.id,
            };
          }
        } else if (promotionCodeId) {
          const promoCodeResponse = await attributeViaPromotionCodeId({
            promotionCodeId,
            stripeAccountId,
            workspace,
            mode,
            stripeCustomerId,
            customerDetails: {
              name: charge.customer_details?.name,
              email: charge.customer_details?.email,
              address: charge.customer_details?.address,
            },
          });
          if (promoCodeResponse) {
            ({ linkId, customer, clickEvent, leadEvent } = promoCodeResponse);
          } else {
            return {
              response: `Failed to attribute via promotion code ${promotionCodeId}, skipping...`,
              workspaceId: workspace.id,
            };
          }
        } else {
          return {
            response: `dubCustomerExternalId not found in Stripe checkout session metadata (nor is it available on the connected customer ${stripeCustomerId}), client_reference_id is not a dub_id, and promotion code is not provided, skipping...`,
            workspaceId: workspace.id,
          };
        }
      }
    }

    // if leadEvent is not defined yet, we need to pull it from Tinybird
    if (!leadEvent) {
      const leadEventData = await getLeadEvent({ customerId: customer.id });
      if (!leadEventData) {
        return {
          response: `No lead event found for customer ${customer.id}, skipping...`,
          workspaceId: workspace.id,
        };
      }
      leadEvent = {
        ...leadEventData,
        workspace_id: leadEventData.workspace_id || customer.projectId, // in case for some reason the lead event doesn't have workspace_id
      };
      linkId = leadEvent.link_id;
    }
  } else {
    return {
      response: `No stripeCustomerId or dubCustomerExternalId found in Stripe checkout session metadata, skipping...`,
      workspaceId: workspace.id,
    };
  }

  let chargeAmountTotal =
    (charge.amount_total ?? 0) - (charge.total_details?.amount_tax ?? 0);

  // should never be below 0, but just in case
  if (chargeAmountTotal <= 0) {
    return {
      response: `Checkout session completed for Stripe customer ${stripeCustomerId} but amount is 0, skipping...`,
      workspaceId: workspace.id,
    };
  }

  if (charge.mode === "setup") {
    return {
      response: `Checkout session completed for Stripe customer ${stripeCustomerId} but mode is "setup", skipping...`,
      workspaceId: workspace.id,
    };
  }

  if (charge.payment_status !== "paid") {
    return {
      response: `Checkout session completed for Stripe customer ${stripeCustomerId} but payment_status is not "paid", skipping...`,
      workspaceId: workspace.id,
    };
  }

  if (invoiceId) {
    // Skip if invoice id is already processed
    const ok = await redis.set(
      `trackSale:stripe:invoiceId:${invoiceId}`, // here we assume that Stripe's invoice ID is unique across all customers
      {
        timestamp: new Date().toISOString(),
        dubCustomerExternalId,
        stripeCustomerId,
        stripeAccountId,
        invoiceId,
        customerId: customer.id,
        workspaceId: customer.projectId,
        amount: chargeAmountTotal,
        currency: charge.currency,
      },
      {
        ex: 60 * 60 * 24 * 7,
        nx: true,
      },
    );

    if (!ok) {
      console.info(
        "[checkout.session.completed] Skipping already processed invoice.",
        invoiceId,
      );

      return {
        response: `Invoice with ID ${invoiceId} already processed, skipping...`,
        workspaceId: workspace.id,
      };
    }
  }

  if (charge.currency && charge.currency !== "usd" && chargeAmountTotal) {
    // support for Stripe Adaptive Pricing: https://docs.stripe.com/payments/checkout/adaptive-pricing
    if (charge.currency_conversion) {
      charge.currency = charge.currency_conversion.source_currency;
      chargeAmountTotal = charge.currency_conversion.amount_total;

      // if Stripe Adaptive Pricing is not enabled, we convert the amount to USD based on the current FX rate
      // TODO: allow custom "defaultCurrency" on workspace table in the future
    } else {
      const { currency: convertedCurrency, amount: convertedAmount } =
        await convertCurrency({
          currency: charge.currency,
          amount: chargeAmountTotal,
        });

      charge.currency = convertedCurrency;
      chargeAmountTotal = convertedAmount;
    }
  }

  const saleData = {
    ...leadEvent,
    workspace_id: leadEvent.workspace_id || customer.projectId, // in case for some reason the lead event doesn't have workspace_id
    event_id: nanoid(16),
    // if the charge is a one-time payment, we set the event name to "Purchase"
    event_name:
      charge.mode === "payment" ? "Purchase" : "Subscription creation",
    payment_processor: "stripe",
    amount: chargeAmountTotal,
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

  const [_sale, linkUpdated] = await Promise.all([
    recordSale(saleData),

    // update link stats
    link &&
      prisma.link.update({
        where: {
          id: link.id,
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
            increment: chargeAmountTotal,
          },
        },
        include: includeTags,
      }),

    // update workspace usage
    prisma.project.update({
      where: {
        id: customer.projectId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),

    // update customer stats + program/partner associations
    prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        ...(link?.programId && {
          programId: link.programId,
        }),
        ...(link?.partnerId && {
          partnerId: link.partnerId,
        }),
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: chargeAmountTotal,
        },
        firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
        subscriptionCanceledAt: null,
        ...(!customer?.stripeCustomerId &&
          stripeCustomerId && {
            stripeCustomerId,
          }),
      },
    }),
  ]);

  let result:
    | Awaited<ReturnType<typeof queuePartnerCommissionCreation>>
    | undefined = undefined;

  if (link && link.programId && link.partnerId) {
    const products = await getCheckoutSessionProducts({
      checkoutSessionId: charge.id,
      stripeAccountId,
      mode,
    });

    result = await queuePartnerCommissionCreation({
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
          signupDate: customer.createdAt,
        },
        sale: {
          products,
          amount: saleData.amount,
          ...(charge.metadata && Object.keys(charge.metadata).length > 0
            ? { metadata: charge.metadata }
            : {}),
        },
      },
      clickEvent: {
        url: saleData.url,
        referer: saleData.referer,
      },
      isFirstConversion: firstConversionFlag,
    });

    waitUntil(
      Promise.allSettled([
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
      ]),
    );
  }

  waitUntil(
    Promise.allSettled([
      sendWorkspaceWebhook({
        trigger: "sale.created",
        workspace,
        data: transformSaleEventData({
          ...saleData,
          clickedAt: customer.clickedAt || customer.createdAt,
          link: linkUpdated,
          customer,
          partner: result?.webhookPartner,
          metadata: null,
        }),
      }),

      ...(link?.partnerId
        ? [
            sendPartnerPostback({
              partnerId: link.partnerId,
              event: "sale.created",
              data: {
                ...saleData,
                clickedAt: customer.clickedAt || customer.createdAt,
                link: linkUpdated,
                customer,
              },
            }),
          ]
        : []),
    ]),
  );

  return {
    response: `Checkout session completed for customer with external ID ${dubCustomerExternalId} and invoice ID ${invoiceId}`,
    workspaceId: workspace.id,
  };
}
