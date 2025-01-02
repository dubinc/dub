import "dotenv-flow/config";
import { stripe } from "../lib/stripe";

async function main() {
  const res = await stripe.accounts.del("acct_1QXo9yAcGXCpUghU");
  console.log(res);
}

main();
