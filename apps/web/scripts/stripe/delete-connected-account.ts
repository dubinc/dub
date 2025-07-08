import "dotenv-flow/config";
import { stripeConnectClient } from "./connect-client";

async function main() {
  const res = await stripeConnectClient.accounts.del("acct_1QpUzRPQKTxd7zPB");
  console.log(res);
}

main();
