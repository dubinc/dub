import { bulkDeactivatePartners } from "@/lib/api/partners/bulk-deactivate-partners";
import { CRON_BATCH_SIZE, qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
});

// POST /api/cron/programs/deactivate - deactivate all partners in a program
export const POST = withCron(async ({ rawBody }) => {
  const { programId } = inputSchema.parse(JSON.parse(rawBody));

  console.info(`[deactivateProgram] Processing program ${programId}...`);

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      deactivatedAt: true,
    },
  });

  if (!program) {
    return logAndRespond(`Program ${programId} not found.`);
  }

  if (!program.deactivatedAt) {
    return logAndRespond(
      `Program ${programId} is not deactivated. Skipping...`,
    );
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      id: true,
      partnerId: true,
    },
    take: CRON_BATCH_SIZE,
  });

  if (programEnrollments.length === 0) {
    return logAndRespond(
      `[deactivateProgram] No more partners to deactivate for program ${programId}. Exiting...`,
    );
  }

  const partnerIds = programEnrollments.map(({ partnerId }) => partnerId);

  await bulkDeactivatePartners({
    workspaceId: program.workspaceId,
    programId,
    partnerIds,
    programDeactivated: true,
  });

  // Self-queue the next batch if there are more partners to process
  if (programEnrollments.length === CRON_BATCH_SIZE) {
    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/programs/deactivate`,
      body: {
        programId,
      },
    });

    return logAndRespond(
      `[deactivateProgram] Processed ${partnerIds.length} partners. Queued next batch ${response.messageId}.`,
    );
  }

  return logAndRespond(
    `[deactivateProgram] Finished deactivating all partners for program ${programId}.`,
  );
});
