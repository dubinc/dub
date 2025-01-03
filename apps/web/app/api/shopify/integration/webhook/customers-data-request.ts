import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
  orders_requested: z.array(z.number()),
  customer: z.object({
    id: z.number(),
    email: z.string(),
    phone: z.string(),
  }),
});

export async function customersDataRequest({ event }: { event: any }) {
  const {
    customer,
    shop_domain: shopDomain,
    orders_requested: ordersRequested,
  } = schema.parse(event);

  waitUntil(
    sendEmail({
      email: "steven@dub.co",
      from: "Steven Tey <steven@dub.co>",
      subject: "[Shopify] - Customer Data Request received",
      text: `Customer Data Request received for shop: ${shopDomain}. 
      Customer ID: ${customer.id}, 
      Email: ${customer.email}, 
      Phone: ${customer.phone}, 
      Orders Requested: ${ordersRequested.join(", ")}`,
    }),
  );

  return "[Shopify] Customer Data Request received.";
}
