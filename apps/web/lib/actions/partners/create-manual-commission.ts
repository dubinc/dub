"use server";

import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { qstash } from "@/lib/cron";
import {
  createPartnerCommission,
  CreatePartnerCommissionProps,
} from "@/lib/partners/create-partner-commission";
import { getCustomerEventsTB } from "@/lib/tinybird/get-customer-events-tb";
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
import { WorkflowTrigger } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, nanoid, prettyPrint } from "@dub/utils";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

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
      useExistingEvents,
      // custom commission attributes
      date,
      amount,
      description,
      // lead attributes
      customerId,
      linkId,
      leadEventDate,
      leadEventName,
      // sale attributes
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
    if (!linkId) {
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

    if (!customerId || !customer || customer.projectId !== workspace.id) {
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
    const commissionsToTransferEventIds: string[] = []; // eventIds for the commissions to transfer to the new customer-partner pair – we need to nullify them later
    const commissionsToCreate: CreatePartnerCommissionProps[] = [];

    // Track event timestamps for updating link stats
    let leadEventTimestamp: Date | null = null;
    let saleEventTimestamp: Date | null = null;

    // If we're using existing events, we need to duplicate them under the new customer.id
    if (useExistingEvents) {
      if (!customer.linkId) {
        throw new Error(
          `No linkId found for existing customer ${customer.id}.`,
        );
      }

      if (customer.linkId === link.id) {
        throw new Error(
          `Customer ${customer.id} is already attributed to link ${link.id}.`,
        );
      }

      // fetch existing customer events and duplicate them under the new customer.id
      const existingCustomerEvents = await getCustomerEventsTB({
        customerId: customer.id,
        linkIds: [customer.linkId],
      }).then((res) => res.data);

      if (existingCustomerEvents.length === 0) {
        throw new Error(
          `No existing events found for customer ${customer.id}.`,
        );
      }

      const existingClickEvent = existingCustomerEvents.find(
        (event) => event.event === "click",
      );
      console.log("Found existing click event: ", existingClickEvent);
      const existingLeadEvent = existingCustomerEvents.find(
        (event) => event.event === "lead",
      );
      console.log("Found existing lead event: ", existingLeadEvent);
      const existingSaleEvents = existingCustomerEvents.filter(
        (event) => event.event === "sale",
      );
      console.log("Found existing sale events: ", existingSaleEvents);

      const newClickAttributes = {
        click_id: nanoid(16), // create new clickId
        link_id: link.id, // set to new link.id,
      };
      const clickEventData = recordClickZodSchema.parse({
        ...existingClickEvent,
        ...newClickAttributes,
      });

      console.log("Click event to record: ", clickEventData);
      if (existingClickEvent) {
        tbEventsToRecord.push(recordClickZod(clickEventData));
      }

      const duplicateCustomerId = createId({ prefix: "cus_" });

      if (existingLeadEvent) {
        const leadEventData = leadEventSchemaTBWithTimestamp.parse({
          ...clickEventData,
          ...existingLeadEvent,
          ...newClickAttributes, // make sure new click attributes are not overridden by existing click attributes
          event_id: nanoid(16), // create new event_id
          link_id: link.id, // set to new link.id
          customer_id: duplicateCustomerId, // set to new duplicateCustomerId
        });
        console.log("Lead event to record: ", leadEventData);
        tbEventsToRecord.push(recordLeadWithTimestamp(leadEventData));

        // Store the original lead eventId for nullification
        commissionsToTransferEventIds.push(existingLeadEvent.event_id);

        if (commissionType === "lead") {
          // add the new lead event to the list of commissions to create
          commissionsToCreate.push({
            event: "lead" as const,
            programId,
            partnerId,
            linkId: link.id,
            customerId: duplicateCustomerId,
            eventId: leadEventData.event_id,
            quantity: 1,
            createdAt: new Date(leadEventData.timestamp + "Z"), // add the "Z" to the timestamp to make it UTC
            user,
            context: {
              customer: { country: customer.country },
            },
          });
          // Track the lead event timestamp for link stats update
          leadEventTimestamp = new Date(leadEventData.timestamp + "Z");
        }
      }

      const recordSaleEvents =
        commissionType === "sale" && existingSaleEvents.length > 0;

      if (recordSaleEvents) {
        if (existingSaleEvents.length > 5) {
          throw new Error(
            `You can only backfill up to 5 sale events. Found ${existingSaleEvents.length} existing sale events.`,
          );
        }

        const saleEventsData = existingSaleEvents.map((existingSaleEvent) =>
          saleEventSchemaTBWithTimestamp.parse({
            ...clickEventData,
            ...existingSaleEvent,
            ...newClickAttributes, // make sure new click attributes are not overridden
            event_id: nanoid(16), // create new event_id
            link_id: link.id, // set to new link.id
            customer_id: duplicateCustomerId, // set to new duplicateCustomerId
            amount: existingSaleEvent.saleAmount, // change format returned by Tinybird
          }),
        );
        console.log("Sale events to record: ", saleEventsData);
        tbEventsToRecord.push(recordSaleWithTimestamp(saleEventsData));

        // Store the original sale eventIds for nullification
        commissionsToTransferEventIds.push(
          ...existingSaleEvents.map(
            (existingSaleEvent) => existingSaleEvent.event_id,
          ),
        );

        if (commissionType === "sale") {
          // add the new sale events to the list of commissions to create
          commissionsToCreate.push(
            ...saleEventsData.map((saleEventData) => ({
              event: "sale" as const,
              programId,
              partnerId,
              linkId: link.id,
              customerId: duplicateCustomerId,
              eventId: saleEventData.event_id,
              quantity: 1,
              amount: saleEventData.amount,
              currency: saleEventData.currency,
              invoiceId: saleEventData.invoice_id,
              createdAt: new Date(saleEventData.timestamp + "Z"), // add the "Z" to the timestamp to make it UTC
              user,
              context: {
                customer: { country: customer.country },
                sale: { productId },
              },
            })),
          );
          // Track the latest sale event timestamp for link stats update
          const latestSaleTimestamp = Math.max(
            ...saleEventsData.map((data) =>
              new Date(data.timestamp + "Z").getTime(),
            ),
          );
          saleEventTimestamp = new Date(latestSaleTimestamp);
        }
        totalSales = existingSaleEvents.length;
        totalSaleAmount = existingSaleEvents.reduce(
          (acc, saleEvent) => acc + saleEvent.saleAmount,
          0,
        );
      }

      const duplicatedCustomer = await prisma.$transaction(async (tx) => {
        await tx.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            name: customer.name ? `${customer.name} (old)` : undefined,
            externalId: `dummy_${nanoid(32)}`, // generate random externalId
            stripeCustomerId: null,
            linkId: null,
            programId: null,
            partnerId: null,
            clickId: null,
          },
        });

        return await tx.customer.create({
          data: {
            ...customer,
            id: duplicateCustomerId,
            linkId: link.id,
            programId: link.programId,
            partnerId: link.partnerId,
            clickId: clickEventData.click_id,
            clickedAt: new Date(clickEventData.timestamp),
            country:
              clickEventData.country === "Unknown"
                ? null
                : clickEventData.country,
            ...(recordSaleEvents && {
              sales: totalSales,
              saleAmount: totalSaleAmount,
            }),
          },
        });
      });

      console.log(
        `Duplicated customer ${customer.id} to ${duplicatedCustomer.id}: `,
        duplicatedCustomer,
      );

      // Else, we create new events
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
        const finalCommissionsToTransferEventIds =
          commissionsToTransferEventIds.filter(
            (eventId) => typeof eventId === "string",
          );

        console.log(
          "Final commissions to transfer event ids: ",
          finalCommissionsToTransferEventIds,
        );

        const firstConversionFlag =
          commissionType === "sale" &&
          isFirstConversion({
            customer,
            linkId,
          });

        const updatedRes = await Promise.all([
          // update link stats
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
          }),

          // update the commissions
          finalCommissionsToTransferEventIds.length > 0 &&
            prisma.commission.updateMany({
              where: {
                eventId: {
                  in: finalCommissionsToTransferEventIds,
                },
              },
              data: {
                eventId: null,
                invoiceId: null,
              },
            }),
        ]);

        console.log(
          `Updated link${finalCommissionsToTransferEventIds.length > 0 ? " and nullified old commissions" : ""}:`,
          updatedRes,
        );

        console.log("Commissions to create: ", commissionsToCreate);

        // create partner commissions
        await Promise.allSettled(
          commissionsToCreate.map((commission) =>
            createPartnerCommission(commission),
          ),
        );

        // execute workflows
        if (["lead", "sale"].includes(commissionType)) {
          await Promise.allSettled([
            executeWorkflows({
              trigger:
                commissionType === "lead"
                  ? WorkflowTrigger.leadRecorded
                  : WorkflowTrigger.saleRecorded,
              context: {
                programId,
                partnerId,
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

async function triggerAggregateDueCommissionsCronJob(programId: string) {
  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions`,
    body: {
      programId,
    },
  });
  console.log(
    `Triggered aggregate due commissions cron job for program ${programId}: ${prettyPrint(qstashResponse)}`,
  );
}
