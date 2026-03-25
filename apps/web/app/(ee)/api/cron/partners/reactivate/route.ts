import { bulkReactivatePartners } from "@/lib/api/partners/bulk-reactivate-partners";
import { CRON_BATCH_SIZE, qstash } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

const inputSchema = z.object({
  programId: z.string(),
});

// POST /api/cron/partners/reactivate - reactivate partners in a program
export const POST = withCron(async ({ rawBody }) => {
  const { programId } = inputSchema.parse(JSON.parse(rawBody));

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      deactivatedAt: true,
      slug: true,
      defaultGroupId: true,
      supportEmail: true,
    },
  });

  if (!program) {
    return logAndRespond(`Program ${programId} not found.`);
  }

  if (program.deactivatedAt) {
    return logAndRespond(
      `Program ${programId} is still deactivated. Skipping...`,
    );
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      status: "deactivated",
    },
    select: {
      id: true,
      partnerId: true,
      groupId: true,
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: CRON_BATCH_SIZE,
  });

  if (programEnrollments.length > 0) {
    await bulkReactivatePartners({
      program,
      programEnrollments,
    });

    // Self-queue the next batch if there are more partners to process
    if (programEnrollments.length === CRON_BATCH_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/reactivate`,
        body: {
          programId,
        },
      });

      return logAndRespond(
        `[reactivatePartners] Processed ${programEnrollments.length} partners. Queued next batch (messageId: ${response.messageId}).`,
      );
    }
  }

  // All batches done – queue discount code creation for discounts with auto-provision enabled
  const discounts = await prisma.discount.findMany({
    where: {
      programId,
      autoProvisionEnabledAt: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (discounts.length > 0) {
    await enqueueBatchJobs(
      discounts.map((discount) => ({
        queueName: "create-discount-code",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
        deduplicationId: `reactivate-discount-${discount.id}`,
        body: {
          discountId: discount.id,
        },
      })),
    );

    console.log(
      `[reactivatePartners] Queued discount code creation for ${discounts.length} discounts.`,
    );
  }

  return logAndRespond(
    `[reactivatePartners] Finished reactivating ${programEnrollments.length} partners for program ${programId}.`,
  );
});
