import { getEvents } from "@/lib/analytics/get-events";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { CreatePartnerCommissionProps, SaleEvent } from "@/lib/types";
import "dotenv-flow/config";

// import { prisma } from "@/lib/prisma";
// import { linkCache } from "../../lib/api/links/cache";
// import { includeTags } from "../../lib/api/links/include-tags";
// import { recordLink } from "../../lib/tinybird";

const customers = [
  {
    programId: "prog_1JWVR53QX1NM7NDEK62E3J19H",
    customerId: "cus_1KFG74QEEEXKFW87P6JFHT24D",
    partnerId: "pn_1K7FJ5GSDVHDG89HY08NB0X0F",
  },
];

// August 29

type CustomerEvent = {
  eventId: string;
  linkId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  metadata: Record<string, any>;
};

// Aug 29, 03:55:18 – Aug 29, 04:03:55 UTC
const EVENT_WINDOW_START = new Date("2026-08-29T03:55:18.000Z");
const EVENT_WINDOW_END = new Date("2026-08-29T04:03:55.000Z");

function pickSaleEvent(events: SaleEvent[]): SaleEvent | undefined {
  if (events.length === 1) {
    return events[0];
  }

  return events.find((event) => {
    const timestamp = new Date(event.timestamp);
    return timestamp >= EVENT_WINDOW_START && timestamp <= EVENT_WINDOW_END;
  });
}

async function main() {
  let workflowsData: CreatePartnerCommissionProps[] = [];

  for (const { programId, partnerId, customerId } of customers) {
    // @ts-ignore
    const events: SaleEvent[] = await getEvents({
      event: "sales",
      customerId,
      page: 1,
      limit: 10,
      sortBy: "timestamp",
      sortOrder: "desc",
    });

    if (events.length === 0) {
      console.log(`No events found for customer ${customerId}`);
      continue;
    }

    const event = pickSaleEvent(events);

    if (!event) {
      console.log(
        `No matching Aug 29 window event for customer ${customerId} (${events.length} events)`,
      );
      continue;
    }

    workflowsData.push({
      event: "sale",
      programId,
      partnerId,
      customerId,
      linkId: event.link.id,
      eventId: event.eventId,
      invoiceId: event.sale.invoiceId,
      amount: event.sale.amount,
      currency: event.sale.currency,
      metadata: event.metadata,
      quantity: 1,
    });
  }

  console.log(`Triggering ${workflowsData.length} workflows`, workflowsData);

  const results = await Promise.allSettled(
    workflowsData.map((workflow) => queuePartnerCommissionCreation(workflow)),
  );

  console.log("Results", results);
}

main();
