import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function deactivateProgram(programId: string) {
  const response = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/deactivate`,
    body: { programId },
  });

  console.log("[deactivateProgram] Deactivation job enqueued.", { response });

  return response;
}
