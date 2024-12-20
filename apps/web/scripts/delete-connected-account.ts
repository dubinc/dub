import "dotenv-flow/config";
import { stripe } from "./stripe-init";

async function main() {
  const res = await stripe.accounts.del("acct_1QXo9yAcGXCpUghU");
  console.log(res);
}

main();
