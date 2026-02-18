"use server";

import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
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
import { nanoid } from "@dub/utils";
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

    // for useExistingEvents, we need to keep track of some stats so we can update later
    let totalSales = 0;
    let totalSaleAmount = 0;

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

    // Track event timestamps for updating link stats
    let leadEventTimestamp: Date | null = null;
    let saleEventTimestamp: Date | null = null;

    // If we're using existing events (Stripe invoice for sale, or duplicate events for lead)
    if (useExistingEvents) {
      // Sale from selected Stripe invoice: create new events using invoice data
      if (commissionType === "sale" && invoiceId && saleAmount != null) {
        const finalLeadEventDate = saleEventDate ?? new Date();
        const clickId = nanoid(16);
        const clickTimestamp = new Date(
          finalLeadEventDate.getTime() - 5 * 60 * 1000,
        );

        const generatedClickEvent = recordClickZodSchema.parse({
          timestamp: clickTimestamp.toISOString(),
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
          event_name: leadEventName || "Sign up",
          customer_id: customer.id,
          timestamp: finalLeadEventDate.toISOString(),
        });

        tbEventsToRecord.push(recordLeadWithTimestamp(leadEventData));

        const saleEventData = saleEventSchemaTBWithTimestamp.parse({
          ...generatedClickEvent,
          event_id: nanoid(16),
          invoice_id: invoiceId,
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: customer.id,
          payment_processor: "stripe",
          currency: "usd",
          timestamp: new Date(saleEventDate ?? Date.now()).toISOString(),
          metadata: productId ? JSON.stringify({ productId }) : undefined,
        });

        tbEventsToRecord.push(recordSaleWithTimestamp(saleEventData));

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
          createdAt: new Date(saleEventData.timestamp),
          user,
          context: {
            customer: { country: customer.country },
            sale: { productId },
          },
        });

        saleEventTimestamp = new Date(saleEventData.timestamp);
        totalSales = 1;
        totalSaleAmount = saleAmount;

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            linkId: link.id,
            programId: link.programId,
            partnerId: link.partnerId,
            clickId,
            clickedAt: new Date(clickTimestamp),
            sales: { increment: 1 },
            saleAmount: { increment: saleAmount },
            firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
          },
        });
      } else if (commissionType === "lead") {
        if (!customer.linkId) {
          throw new Error(
            `No linkId found for existing customer ${customer.id}.`,
          );
        }
        // TODO: duplicate existing lead events under new link
      } else {
        throw new Error(
          "Select a Stripe invoice when using existing invoices for a sale commission.",
        );
      }
    } else {
      const finalLeadEventDate = leadEventDate ?? saleEventDate ?? new Date();
      const clickId = nanoid(16);
      const clickTimestamp = new Date(
        finalLeadEventDate.getTime() - 5 * 60 * 1000,
      );

      // Record click event
      const generatedClickEvent = recordClickZodSchema.parse({
        timestamp: clickTimestamp.toISOString(),
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
        leadEventTimestamp = new Date(leadEventData.timestamp);
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
          saleEventTimestamp = new Date(saleEventData.timestamp);
        }

        const updatedCustomer = await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            linkId: link.id,
            programId: link.programId,
            partnerId: link.partnerId,
            clickId: clickId,
            clickedAt: new Date(clickTimestamp),
            ...(saleAmount && {
              sales: {
                increment: 1,
              },
              saleAmount: {
                increment: saleAmount,
              },
              firstSaleAt: customer.firstSaleAt ? undefined : new Date(),
            }),
          },
        });
        console.log(
          "Updated customer to include link & sale attributes: ",
          updatedCustomer,
        );
      }
    }

    const res = await Promise.allSettled(tbEventsToRecord);
    console.log("recorded events in Tinybird: ", res);

    waitUntil(
      (async () => {
        console.log("Commissions to create: ", commissionsToCreate);

        // create partner commissions
        await Promise.allSettled(
          commissionsToCreate.map((commission) =>
            createPartnerCommission(commission),
          ),
        );

        const firstConversionFlag =
          commissionType === "sale" &&
          isFirstConversion({
            customer,
            linkId: link.id,
          });

        await prisma.link.update({
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
              newTimestamp: leadEventTimestamp || new Date(),
            }),
            ...(firstConversionFlag && {
              conversions: {
                increment: 1,
              },
              lastConversionAt: updateLinkStatsForImporter({
                currentTimestamp: link.lastConversionAt,
                newTimestamp: saleEventTimestamp || new Date(),
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
        });

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
