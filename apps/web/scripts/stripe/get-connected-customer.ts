import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  const connectedCustomer = await stripeAppClient.customers.retrieve(
    "cus_xxx",
    {
      stripeAccount: "acct_xxx",
    },
  );

  console.log(connectedCustomer);
}

main();
