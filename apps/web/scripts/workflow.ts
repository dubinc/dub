import { Client } from "@upstash/workflow";
import "dotenv-flow/config";

const client = new Client({ token: process.env.QSTASH_TOKEN });

async function main() {
  const response = await client.trigger({
    url: "https://accurate-caribou-strictly.ngrok-free.app/api/workflows/partner-approved",
  });

  console.log(response)
}

main();
