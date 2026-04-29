import "dotenv-flow/config";

import { orderSchema } from "@/lib/integrations/shopify/schema";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  const event = orderSchema.parse({
    confirmation_number: "WDQ0YHYU32",
    checkout_token: "20585787a5a40274b6b34511d2f637e92",
    customer: {
      id: 97773681707702,
      first_name: "John",
      last_name: "Doe",
      email: "customer+2@dub-internal-test.com",
    },
    current_subtotal_price_set: {
      shop_money: {
        amount: "22.50",
        currency_code: "USD",
      },
    },
    discount_codes: [
      {
        code: "D1",
      },
    ],
    billing_address: {
      province: "California",
      country_code: "US",
    },
  });

  const response = await fetch(
    `${APP_DOMAIN_WITH_NGROK}/api/shopify/integration/webhook`,
    {
      method: "POST",
      body: JSON.stringify(event),
      headers: {
        "x-shopify-topic": "orders/paid",
        "x-shopify-shop-domain": "dub-conversions.myshopify.com",
      },
    },
  );

  console.log(response.ok);
}

main();
