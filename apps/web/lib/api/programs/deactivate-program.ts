import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function deactivateProgram(programId: string) {
  if (!programId) {
    throw new Error("[deactivateProgram] programId is required");
  }

  await prisma.program.update({
    where: {
      id: programId,
    },
    data: {
      deactivatedAt: new Date(),
    },
  });

  const response = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/deactivate`,
    body: {
      programId,
    },
  });

  console.log("[deactivateProgram] Deactivation job enqueued.", { response });

  return response;
}
