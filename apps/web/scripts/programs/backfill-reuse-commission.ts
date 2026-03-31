import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
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
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, nanoid, prettyPrint } from "@dub/utils";
import "dotenv-flow/config";
import * as z from "zod/v4";

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

// Script config – set these before running
const COMMISSION_TYPE = "sale" as "lead" | "sale"; // "lead" or "sale"
const PRODUCT_ID: string | undefined = undefined; // optional, for sale context

async function main() {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: "link_xxx",
    },
  });

  const customer = await prisma.customer.findUniqueOrThrow({
    where: {
      id: "cus_xxx",
    },
  });

  const programId = link.programId!;
  const partnerId = link.partnerId!;
  const workspaceId = customer.projectId;

  const tbEventsToRecord: Promise<unknown>[] = [];
  const commissionsToTransferEventIds: string[] = [];
  const commissionsToCreate: CreatePartnerCommissionProps[] = [];
  let leadEventTimestamp: Date | null = null;
  let saleEventTimestamp: Date | null = null;
  let totalSales = 0;
  let totalSaleAmount = 0;
  const user = undefined; // no auth user in script
  const commissionType = COMMISSION_TYPE;
  const productId = PRODUCT_ID;

  if (!customer.linkId) {
    throw new Error(`Customer ${customer.id} has no linkId.`);
  }
  // fetch existing customer events and duplicate them under the new customer.id
  const existingCustomerEvents = await getCustomerEventsTB({
    customerId: customer.id,
    linkIds: [customer.linkId],
  }).then((res) => res.data);

  if (existingCustomerEvents.length === 0) {
    throw new Error(`No existing events found for customer ${customer.id}.`);
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
            customer: {
              country: customer.country,
            },
            sale: {
              productId,
            },
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
          clickEventData.country === "Unknown" ? null : clickEventData.country,
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

  // Record events in Tinybird
  const tbRes = await Promise.allSettled(tbEventsToRecord);
  console.log("Recorded events in Tinybird: ", tbRes);

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
      linkId: link.id,
    });

  // Update link stats and nullify old commissions
  await Promise.all([
    prisma.link.update({
      where: { id: link.id },
      data: {
        clicks: { increment: 1 },
        leads: { increment: 1 },
        lastLeadAt: updateLinkStatsForImporter({
          currentTimestamp: link.lastLeadAt,
          newTimestamp: leadEventTimestamp || new Date(),
        }),
        ...(firstConversionFlag && {
          conversions: { increment: 1 },
          lastConversionAt: updateLinkStatsForImporter({
            currentTimestamp: link.lastConversionAt,
            newTimestamp: saleEventTimestamp || new Date(),
          }),
        }),
        ...(commissionType === "sale" && {
          sales: { increment: totalSales },
          saleAmount: { increment: totalSaleAmount },
        }),
      },
    }),
    finalCommissionsToTransferEventIds.length > 0
      ? prisma.commission.updateMany({
          where: {
            eventId: { in: finalCommissionsToTransferEventIds },
          },
          data: {
            eventId: null,
            invoiceId: null,
          },
        })
      : Promise.resolve(),
  ]);

  console.log(
    `Updated link${finalCommissionsToTransferEventIds.length > 0 ? " and nullified old commissions" : ""}`,
  );

  console.log("Commissions to create: ", commissionsToCreate);
  await Promise.allSettled(
    commissionsToCreate.map((commission) =>
      createPartnerCommission({ ...commission, skipWorkflow: true }),
    ),
  );

  if (["lead", "sale"].includes(commissionType)) {
    await Promise.allSettled([
      executeWorkflows({
        trigger: "partnerMetricsUpdated",
        reason: "commission",
        identity: {
          workspaceId,
          programId,
          partnerId,
        },
        metrics: {
          current: {
            leads: commissionType === "lead" ? 1 : 0,
            saleAmount: totalSaleAmount,
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

  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions`,
    body: { programId },
  });
  console.log(
    `Triggered aggregate due commissions cron job for program ${programId}: ${prettyPrint(qstashResponse)}`,
  );
}

main();
