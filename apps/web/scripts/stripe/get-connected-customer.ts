import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  const connectedCustomer = await stripeAppClient.customers.retrieve(
    "cus_SCCWOFWpb9aU5v",
    {
      stripeAccount: "acct_1QmcXXKojVEYZPlX",
    },
  );

  console.log(connectedCustomer);
}

main();
