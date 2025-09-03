import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  const email = "xxx";

  const stripeCustomers = await stripeAppClient({
    livemode: true,
  }).customers.search(
    {
      query: `email:'${email}'`,
    },
    {
      stripeAccount: "xxx",
    },
  );
  console.log(JSON.stringify(stripeCustomers, null, 2));
}

main();
