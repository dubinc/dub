import { sendEmail } from "@dub/email";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
  orders_to_redact: z.array(z.number()),
  customer: z.object({
    id: z.number(),
    email: z.string(),
    phone: z.string(),
  }),
});

export async function customersRedact({ event }: { event: any }) {
  const {
    customer,
    shop_domain: shopDomain,
    orders_to_redact: ordersToRedact,
  } = schema.parse(event);

  waitUntil(
    sendEmail({
      email: "steven@dub.co",
      from: "Steven Tey <steven@dub.co>",
      subject: "[Shopify] - Customer Redacted request received",
      text: `Customer Redacted request received for shop: ${shopDomain}. 
      Customer ID: ${customer.id}, 
      Email: ${customer.email}, 
      Phone: ${customer.phone}, 
      Orders to Redact: ${ordersToRedact.join(", ")}`,
    }),
  );

  return "[Shopify] Customer Redacted request received.";
}
