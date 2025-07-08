import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const balance = await stripeConnectClient.balance.retrieve();
  console.log(balance);
}

main();
