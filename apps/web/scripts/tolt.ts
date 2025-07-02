import "dotenv-flow/config";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/import/tolt`,
    body: {
      action: "update-stripe-customers",
      programId: "prog_CYCu7IMAapjkRpTnr8F1azjN",
      // page: 0,
    },
  });
}

main();
