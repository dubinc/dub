import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";

const customerId = "xxx";

async function main() {
  const leadEvent = await getLeadEvent({ customerId });

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent.data[0]);

  await recordSale(
    Array.from({ length: 420 }, () => ({
      ...clickData,
      // random timestamp between now and 30 days ago
      timestamp: new Date(
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      ).toISOString(),
      customer_id: customerId,
      event_id: nanoid(16),
      payment_processor: "Stripe",
      product_id: "xxx",
      invoice_id: "xxx",
      // random amount between 2400 and 9900, in increments of 100
      amount: Math.floor(Math.random() * 75 + 24) * 100,
      currency: "usd",
      recurring: 1,
      recurring_interval: "monthly",
      recurring_interval_count: 1,
      refunded: 0,
      metadata: "",
    })),
  );
}

main();
