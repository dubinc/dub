"use server";

import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { getCustomerStripeInvoices } from "@/lib/api/customers/get-customer-stripe-invoices";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import {
  createPartnerCommission,
  CreatePartnerCommissionProps,
} from "@/lib/partners/create-partner-commission";
import {
  recordClickZod,
  recordClickZodSchema,
} from "@/lib/tinybird/record-click-zod";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { nanoid, prettyPrint } from "@dub/utils";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";
import { triggerAggregateDueCommissionsCronJob } from "./trigger-aggregate-due-commissions";

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

export const createManualCommissionAction = authActionClient
  .inputSchema(createCommissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const {
      partnerId,
      commissionType,
      // custom commission attributes
      date,
      amount,
      description,
      // customer attributes (for lead and sale commissions)
      customerId,
      linkId,
      // lead attributes
      leadEventDate,
      leadEventName,
      // sale attributes
      useExistingEvents,
      saleEventDate,
      saleAmount,
      invoiceId,
      productId,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [{ partner, links }, customer] = await Promise.all([
      getProgramEnrollmentOrThrow({
        programId,
        partnerId,
        include: {
          partner: true,
          links: true,
        },
      }),

      customerId
        ? prisma.customer.findUniqueOrThrow({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),
    ]);

    // Create a custom commission
    if (commissionType === "custom") {
      await createPartnerCommission({
        event: "custom",
        partnerId,
        programId,
        amount: amount ?? 0,
        quantity: 1,
        createdAt: date ?? new Date(),
        user,
        description,
      });

      waitUntil(triggerAggregateDueCommissionsCronJob(programId));

      return;
    }

    if (!customer || customer.projectId !== workspace.id) {
      throw new Error(
        `Customer${customerId ? ` with customerId ${customerId}` : ""} not found.`,
      );
    }

    const link = links.find((l) => l.id === linkId);

    if (!link) {
      throw new Error(
        `Link ${linkId} does not belong to partner ${partner.email} (${partnerId}).`,
      );
    }

    if (invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          invoiceId_programId: {
            invoiceId,
            programId,
          },
        },
        select: {
          id: true,
        },
      });

      if (commission) {
        throw new Error(
          `There is already a commission for the invoice ${invoiceId}.`,
        );
      }
    }

    const tbEventsToRecord: Promise<any>[] = []; // a list of promises of events to record in Tinybird
    const commissionsToCreate: CreatePartnerCommissionProps[] = [];

    // keep track of click event to update customer later
    let clickId: string | undefined = undefined;
    let clickedAt: Date | undefined = undefined;

    // keep track of link stats to update later
    let totalSales = 0;
    let totalSaleAmount = 0;
    let lastLeadAt: Date | undefined = undefined;
    let lastConversionAt: Date | undefined = undefined;

    // If we're using existing events (Stripe invoice for sale)
    if (useExistingEvents) {
      if (!workspace.stripeConnectId) {
        throw new Error(
          "Your workspace isn't connected to Stripe yet. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
        );
      }

      if (!customer.stripeCustomerId) {
        throw new Error(
          `Customer ${customer.id} doesn't have a Stripe customer ID. Add one in the customer profile before proceeding.`,
        );
      }

      const stripeCustomerInvoices = await getCustomerStripeInvoices({
        stripeCustomerId: customer.stripeCustomerId,
        stripeConnectId: workspace.stripeConnectId,
      }).then(
        (
          invoices, // sort invoices by created date ascending
        ) => invoices.sort((a, b) => a.created.getTime() - b.created.getTime()),
      );

      if (stripeCustomerInvoices.length === 0) {
        throw new Error(
          `No paid Stripe invoices found for customer ${customer.email} (${customer.stripeCustomerId}).`,
        );
      }

      lastLeadAt = stripeCustomerInvoices[0].created;
      lastConversionAt = stripeCustomerInvoices[0].created;

      clickId = nanoid(16);
      clickedAt = new Date(lastLeadAt.getTime() - 5 * 60 * 1000);

      const generatedClickEvent = recordClickZodSchema.parse({
        timestamp: clickedAt.toISOString(),
        identity_hash: customer.externalId || customer.id,
        click_id: clickId,
        link_id: link.id,
        url: link.url,
        ip: "127.0.0.1",
        continent: customer.country
          ? COUNTRIES_TO_CONTINENTS[customer.country.toUpperCase()] || ""
          : "",
      });

      tbEventsToRecord.push(recordClickZod(generatedClickEvent));

      const leadEventData = leadEventSchemaTBWithTimestamp.parse({
        ...generatedClickEvent,
        event_id: nanoid(16),
        event_name: "Sign up",
        customer_id: customer.id,
        timestamp: lastLeadAt.toISOString(),
      });

      tbEventsToRecord.push(recordLeadWithTimestamp(leadEventData));

      const saleEventData = stripeCustomerInvoices.map((invoice) =>
        saleEventSchemaTBWithTimestamp.parse({
          ...generatedClickEvent,
          event_id: nanoid(16),
          invoice_id: invoice.id,
          event_name: "Purchase",
          amount: invoice.amount_paid,
          customer_id: customer.id,
          payment_processor: "stripe",
          currency: "usd",
          timestamp: invoice.created.toISOString(),
        }),
      );

      tbEventsToRecord.push(recordSaleWithTimestamp(saleEventData));

      commissionsToCreate.push(
        ...saleEventData.map((saleEvent) => ({
          event: "sale" as const,
          programId,
          partnerId,
          linkId: link.id,
          customerId: customer.id,
          eventId: saleEvent.event_id,
          quantity: 1,
          amount: saleEvent.amount,
          currency: saleEvent.currency,
          invoiceId: saleEvent.invoice_id,
          createdAt: new Date(saleEvent.timestamp),
          user,
          context: {
            customer: { country: customer.country },
          },
        })),
      );
      totalSales = saleEventData.length;
      totalSaleAmount = saleEventData.reduce(
        (acc, saleEvent) => acc + saleEvent.amount,
        0,
      );
    } else {
      const finalLeadEventDate = leadEventDate ?? saleEventDate ?? new Date();
      clickId = nanoid(16);
      clickedAt = new Date(finalLeadEventDate.getTime() - 5 * 60 * 1000);

      // Record click event
      const generatedClickEvent = recordClickZodSchema.parse({
        timestamp: clickedAt.toISOString(),
        identity_hash: customer.externalId || customer.id,
        click_id: clickId,
        link_id: link.id,
        url: link.url,
        ip: "127.0.0.1",
        continent: customer.country
          ? COUNTRIES_TO_CONTINENTS[customer.country.toUpperCase()] || ""
          : "",
      });

      tbEventsToRecord.push(recordClickZod(generatedClickEvent));

      // Record lead event
      const leadEventData = leadEventSchemaTBWithTimestamp.parse({
        ...generatedClickEvent,
        event_id: nanoid(16),
        event_name: leadEventName || "Sign up",
        customer_id: customer.id,
        timestamp: finalLeadEventDate.toISOString(),
      });

      console.log("New lead event to record: ", leadEventData);

      tbEventsToRecord.push(recordLeadWithTimestamp(leadEventData));

      if (commissionType === "lead") {
        commissionsToCreate.push({
          event: "lead" as const,
          programId,
          partnerId,
          linkId: link.id,
          customerId: customer.id,
          eventId: leadEventData.event_id,
          quantity: 1,
          createdAt: new Date(leadEventData.timestamp), // we don't add the "Z" to the timestamp because it's already in UTC
          user,
          context: {
            customer: { country: customer.country },
          },
        });
        // Track the lead event timestamp for link stats update
        lastLeadAt = new Date(leadEventData.timestamp);
      }

      // Prepare sale event if requested
      if (saleAmount) {
        const saleEventData = saleEventSchemaTBWithTimestamp.parse({
          ...generatedClickEvent,
          event_id: nanoid(16),
          invoice_id: invoiceId ?? "",
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: customer.id,
          payment_processor: "custom",
          currency: "usd",
          timestamp: new Date(saleEventDate ?? Date.now()).toISOString(),
          metadata: productId ? JSON.stringify({ productId }) : undefined,
        });

        console.log("New sale event to record: ", saleEventData);

        tbEventsToRecord.push(recordSaleWithTimestamp(saleEventData));

        if (commissionType === "sale") {
          commissionsToCreate.push({
            event: "sale" as const,
            programId,
            partnerId,
            linkId: link.id,
            customerId: customer.id,
            eventId: saleEventData.event_id,
            quantity: 1,
            amount: saleEventData.amount,
            currency: saleEventData.currency,
            invoiceId: saleEventData.invoice_id,
            createdAt: new Date(saleEventData.timestamp), // we don't add the "Z" to the timestamp because it's already in UTC
            user,
            context: {
              customer: { country: customer.country },
              sale: { productId },
            },
          });
          // Track the sale event timestamp for link stats update
          lastConversionAt = new Date(saleEventData.timestamp);
        }
      }
    }

    // record events in Tinybird
    const tbRes = await Promise.allSettled(tbEventsToRecord);
    console.log("recorded events in Tinybird: ", prettyPrint(tbRes));

    // create partner commissions
    await Promise.allSettled(
      commissionsToCreate.map((commission) =>
        createPartnerCommission(commission),
      ),
    );

    console.log(
      `Created ${commissionsToCreate.length} commissions: ${prettyPrint(commissionsToCreate)}`,
    );

    waitUntil(
      (async () => {
        const firstConversionFlag =
          commissionType === "sale" &&
          isFirstConversion({
            customer,
            linkId: link.id,
          });

        await Promise.allSettled([
          prisma.link.update({
            where: {
              id: link.id,
            },
            data: {
              // we'll always create click + lead events, so need to increment the stats
              clicks: {
                increment: 1,
              },
              leads: {
                increment: 1,
              },
              lastLeadAt: updateLinkStatsForImporter({
                currentTimestamp: link.lastLeadAt,
                newTimestamp: lastLeadAt || new Date(),
              }),
              ...(firstConversionFlag && {
                conversions: {
                  increment: 1,
                },
                lastConversionAt: updateLinkStatsForImporter({
                  currentTimestamp: link.lastConversionAt,
                  newTimestamp: lastConversionAt || new Date(),
                }),
              }),
              ...(commissionType === "sale" && {
                sales: {
                  increment: saleAmount ? 1 : totalSales,
                },
                saleAmount: {
                  increment: saleAmount ?? totalSaleAmount,
                },
              }),
            },
          }),
          prisma.customer.update({
            where: {
              id: customer.id,
            },
            data: {
              linkId: link.id,
              programId: link.programId,
              partnerId: link.partnerId,
              clickId,
              clickedAt,
              sales: {
                increment: totalSales,
              },
              saleAmount: {
                increment: totalSaleAmount,
              },
              firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
            },
          }),
        ]);

        // execute workflows
        if (["lead", "sale"].includes(commissionType)) {
          await Promise.allSettled([
            executeWorkflows({
              trigger: "partnerMetricsUpdated",
              reason: "commission",
              identity: {
                workspaceId: workspace.id,
                programId,
                partnerId,
              },
              metrics: {
                current: {
                  leads: commissionType === "lead" ? 1 : 0,
                  saleAmount: saleAmount ?? totalSaleAmount,
                  conversions: firstConversionFlag ? 1 : 0,
                },
              },
            }),

            syncPartnerLinksStats({
              partnerId,
              programId,
              eventType: commissionType as "lead" | "sale",
            }),
          ]);
        }

        await triggerAggregateDueCommissionsCronJob(programId);
      })(),
    );
  });
