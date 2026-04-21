import { qstash } from "@/lib/cron";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export async function reactivateProgram(programId: string) {
  if (!programId) {
    throw new Error("[reactivateProgram] programId is required");
  }

  await prisma.$transaction([
    prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        deactivatedAt: null,
      },
    }),

    // republish the default group
    prisma.partnerGroup.update({
      where: {
        programId_slug: {
          programId,
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
      data: {
        applicationFormPublishedAt: new Date(),
        landerPublishedAt: new Date(),
      },
    }),
  ]);

  const response = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/reactivate`,
    body: {
      programId,
    },
    deduplicationId: `reactivate-program-${programId}`,
  });

  console.log("[reactivateProgram] Reactivation job enqueued.", { response });

  return response;
}
