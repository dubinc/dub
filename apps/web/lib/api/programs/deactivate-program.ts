import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function deactivateProgram(programId: string) {
  if (!programId) {
    throw new Error("[deactivateProgram] programId is required");
  }

  await prisma.$transaction([
    prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        deactivatedAt: new Date(),
        // additional fields to reset
        messagingEnabledAt: null,
        addedToMarketplaceAt: null,
        featuredOnMarketplaceAt: null,
      },
    }),

    prisma.partnerGroup.updateMany({
      where: {
        programId,
      },
      data: {
        applicationFormPublishedAt: null,
        landerPublishedAt: null,
        autoApprovePartnersEnabledAt: null,
      },
    }),
  ]);

  const response = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/deactivate`,
    body: {
      programId,
    },
    deduplicationId: `deactivate-program-${programId}`,
  });

  console.log("[deactivateProgram] Deactivation job enqueued.", { response });

  return response;
}
