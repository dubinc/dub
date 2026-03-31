import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, prettyPrint } from "@dub/utils";

export async function triggerAggregateDueCommissionsCronJob(programId: string) {
  const qstashResponse = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/aggregate-due-commissions`,
    body: {
      programId,
    },
  });
  console.log(
    `Triggered aggregate due commissions cron job for program ${programId}: ${prettyPrint(qstashResponse)}`,
  );
}
