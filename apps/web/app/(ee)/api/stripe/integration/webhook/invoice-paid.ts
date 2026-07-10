import { convertCurrency } from "@/lib/analytics/convert-currency";
import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { sendPartnerPostback } from "@/lib/postback/send-partner-postback";
import { prisma } from "@/lib/prisma";
import { stripeAppClient } from "@/lib/stripe";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { StripeMode } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { transformSaleEventData } from "@/lib/webhook/transform";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";
import { attributeViaPromotionCodeId } from "./utils/attribute-via-promotion-code-id";
import { getConnectedCustomer } from "./utils/get-connected-customer";

// Handle event "invoice.paid"
export async function invoicePaid(
  event: Stripe.InvoicePaidEvent,
  mode: StripeMode,
) {
  const invoice = event.data.object;
  const stripeAccountId = event.account as string;
  const stripeCustomerId = invoice.customer as string | null;
  const invoiceId = invoice.id;

  if (!invoiceId) {
    return {
      response: "Invoice ID not found, skipping...",
    };
  }

  if (!stripeCustomerId) {
    return {
      response: "Stripe customer ID not found on invoice, skipping...",
    };
  }

  // Find customer using stripeCustomerId
  let customer = await prisma.customer.findUnique({
    where: {
      stripeCustomerId,
    },
  });

  // if customer is not found, we check if the connected customer has a dubCustomerExternalId
  if (!customer) {
    const connectedCustomer = await getConnectedCustomer({
      stripeCustomerId,
      stripeAccountId,
      mode,
    });

    const dubCustomerExternalId =
      connectedCustomer?.metadata.dubCustomerExternalId ||
      connectedCustomer?.metadata.dubCustomerId;

    if (dubCustomerExternalId) {
      try {
        // Update customer with stripeCustomerId if exists – for future events
        customer = await prisma.customer.update({
          where: {
            projectConnectId_externalId: {
              projectConnectId: stripeAccountId,
              externalId: dubCustomerExternalId,
            },
          },
          data: {
            stripeCustomerId,
          },
        });
      } catch (error) {
        console.log(error);
        return {
          response: `Customer with dubCustomerExternalId ${dubCustomerExternalId} not found, skipping...`,
        };
      }
    }
  }

  // if customer is still not found, try to attribute via partner discount on the invoice
  if (!customer) {
    const workspace = await prisma.project.findUnique({
      where: {
        stripeConnectId: stripeAccountId,
      },
      select: {
        id: true,
        defaultProgramId: true,
        stripeConnectId: true,
        webhookEnabled: true,
      },
    });

    if (!workspace) {
      return {
        response: `Workspace not found for Stripe account ${stripeAccountId}, skipping...`,
      };
    }

    if (!workspace.defaultProgramId) {
      return {
        response: `Customer with stripeCustomerId ${stripeCustomerId} not found on Dub and workspace has no default program, skipping...`,
        workspaceId: workspace.id,
      };
    }

    const { promotionCodeId, resolvePromotionCodeError } =
      await resolvePromotionCodeIdFromInvoice({
        invoiceId,
        stripeAccountId,
        mode,
      });

    if (promotionCodeId) {
      const promoCodeResponse = await attributeViaPromotionCodeId({
        promotionCodeId,
        stripeAccountId,
        workspace,
        mode,
        stripeCustomerId,
        customerDetails: {
          name: invoice.customer_name,
          email: invoice.customer_email,
          address: invoice.customer_address,
        },
      });

      if (promoCodeResponse) {
        customer = promoCodeResponse.customer;
      }
    } else if (resolvePromotionCodeError) {
      console.log(
        `Failed to resolve promotion code from invoice ${invoiceId}: ${resolvePromotionCodeError}`,
      );
    }

    if (!customer) {
      return {
        response: `Customer with stripeCustomerId ${stripeCustomerId} not found on Dub (nor does the connected customer ${stripeCustomerId} have a valid dubCustomerExternalId or partner discount code on the invoice), skipping...`,
        workspaceId: workspace.id,
      };
    }
  }

  // Sale amount excluding tax: use total_excluding_tax only when invoice was paid in full
  // (amount_paid === total); otherwise use amount_paid (e.g. credits applied, upsells, etc.).
  let invoiceSaleAmount =
    invoice.amount_paid === invoice.total && invoice.total_excluding_tax != null
      ? invoice.total_excluding_tax
      : invoice.amount_paid;

  // Skip if invoice id is already processed
  const ok = await redis.set(
    `trackSale:stripe:invoiceId:${invoiceId}`, // here we assume that Stripe's invoice ID is unique across all customers
    {
      timestamp: new Date().toISOString(),
      dubCustomerExternalId: customer.externalId,
      stripeCustomerId,
      stripeAccountId,
      invoiceId,
      customerId: customer.id,
      workspaceId: customer.projectId,
      amount: invoiceSaleAmount,
      currency: invoice.currency,
    },
    {
      ex: 60 * 60 * 24 * 7,
      nx: true,
    },
  );

  if (!ok) {
    console.info(
      "[invoice.paid] Skipping already processed invoice.",
      invoiceId,
    );
    return {
      response: `Invoice with ID ${invoiceId} already processed, skipping...`,
      workspaceId: customer.projectId,
    };
  }

  // Stripe can sometimes return a negative amount for some reason, so we skip if it's below 0
  if (invoiceSaleAmount <= 0) {
    return {
      response: `Invoice with ID ${invoiceId} has an amount of 0, skipping...`,
      workspaceId: customer.projectId,
    };
  }

  // if currency is not USD, convert it to USD  based on the current FX rate
  // TODO: allow custom "defaultCurrency" on workspace table in the future
  if (invoice.currency && invoice.currency !== "usd") {
    const { currency: convertedCurrency, amount: convertedAmount } =
      await convertCurrency({
        currency: invoice.currency,
        amount: invoiceSaleAmount,
      });

    invoice.currency = convertedCurrency;
    invoiceSaleAmount = convertedAmount;
  }

  // Find lead
  const leadEvent = await getLeadEvent({ customerId: customer.id });
  if (!leadEvent) {
    return {
      response: `Lead event with customer ID ${customer.id} not found, skipping...`,
      workspaceId: customer.projectId,
    };
  }

  const eventId = nanoid(16);

  // if the invoice has no subscription, it's a one-time payment
  const isOneTimePayment = invoice.lines.data.some(
    (line) => line.parent?.subscription_item_details === null,
  );

  const saleData = {
    ...leadEvent,
    workspace_id: leadEvent.workspace_id || customer.projectId, // in case for some reason the lead event doesn't have workspace_id
    event_id: eventId,
    event_name: isOneTimePayment ? "Purchase" : "Invoice paid",
    payment_processor: "stripe",
    amount: invoiceSaleAmount,
    currency: invoice.currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify({
      invoice,
    }),
  };

  const linkId = leadEvent.link_id;
  const link = await prisma.link.findUnique({
    where: {
      id: linkId,
    },
  });

  if (!link) {
    return {
      response: `Link with ID ${linkId} not found, skipping...`,
      workspaceId: customer.projectId,
    };
  }

  const firstConversionFlag = isFirstConversion({
    customer,
    linkId,
  });

  const [_sale, linkUpdated, workspace] = await Promise.all([
    recordSale(saleData),

    // update link stats
    prisma.link.update({
      where: {
        id: linkId,
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
          increment: invoiceSaleAmount,
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
          increment: invoiceSaleAmount,
        },
        firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
      },
    }),
  ]);

  // for program links
  let result:
    | Awaited<ReturnType<typeof queuePartnerCommissionCreation>>
    | undefined = undefined;

  if (link.programId && link.partnerId) {
    const saleMetadata = {
      ...invoice.parent?.subscription_details?.metadata,
      ...invoice.lines.data[0]?.metadata,
      ...invoice.metadata,
    };

    const products = invoice.lines.data
      .map((line) => {
        const productId = line.pricing?.price_details?.product;

        if (!productId) return null;

        return {
          id: productId,
          amount: line.amount,
          quantity: line.quantity ?? 0,
        };
      })
      .filter(
        (p): p is { id: string; amount: number; quantity: number } =>
          p !== null && p.quantity !== null,
      );

    result = await queuePartnerCommissionCreation({
      event: "sale",
      programId: link.programId,
      partnerId: link.partnerId,
      linkId: link.id,
      eventId,
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
          ...(Object.keys(saleMetadata).length > 0
            ? { metadata: saleMetadata }
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
    response: `Sale recorded for customer ID ${customer.id} and invoice ID ${invoiceId}`,
    workspaceId: customer.projectId,
  };
}

async function resolvePromotionCodeIdFromInvoice({
  invoiceId,
  stripeAccountId,
  mode,
}: {
  invoiceId: string;
  stripeAccountId: string;
  mode: StripeMode;
}): Promise<
  | {
      promotionCodeId: string;
      resolvePromotionCodeError: null;
    }
  | {
      promotionCodeId: null;
      resolvePromotionCodeError: string;
    }
> {
  const stripe = stripeAppClient({ mode });

  const expandedInvoice = (await stripe.invoices.retrieve(
    invoiceId,
    {
      expand: ["discounts", "discounts.promotion_code"],
    },
    {
      stripeAccount: stripeAccountId,
    },
  )) as Omit<Stripe.Invoice, "discounts"> & {
    discounts: {
      promotion_code: Stripe.PromotionCode | null;
    }[];
  };

  if (!expandedInvoice) {
    return {
      promotionCodeId: null,
      resolvePromotionCodeError: "Invoice not found", // should never happen, but just in case
    };
  }

  if (!expandedInvoice.discounts || expandedInvoice.discounts.length === 0) {
    return {
      promotionCodeId: null,
      resolvePromotionCodeError: "No discounts found on invoice",
    };
  }

  const discountWithPromotionCode = expandedInvoice.discounts.find((discount) =>
    Boolean(discount?.promotion_code?.id),
  );

  if (!discountWithPromotionCode) {
    return {
      promotionCodeId: null,
      resolvePromotionCodeError: "No promotion code found on invoice discounts",
    };
  }

  return {
    promotionCodeId: discountWithPromotionCode.promotion_code!.id,
    resolvePromotionCodeError: null,
  };
}
