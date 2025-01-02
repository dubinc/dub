import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import { z } from "zod";

const schema = z.object({
  shop_domain: z.string(),
});

export async function shopRedact({ event }: { event: any }) {
  const { shop_domain: shopDomain } = schema.parse(event);

  waitUntil(
    sendEmail({
      email: "steven@dub.co",
      from: "Steven Tey <steven@dub.co>",
      subject: "[Shopify] - Shop Redacted request received",
      text: `Shop Redacted request received for shop: ${shopDomain}`,
    }),
  );
}
