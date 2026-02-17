import { CRON_BATCH_SIZE, qstash } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  discountId: z.string(),
  startingAfter: z.string().optional(),
});

// POST /api/cron/discount-codes/create/queue-batches
export const POST = withCron(async ({ rawBody }) => {
  const { discountId, startingAfter } = inputSchema.parse(JSON.parse(rawBody));

  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    include: {
      program: {
        select: {
          id: true,
          workspace: {
            select: {
              id: true,
              stripeConnectId: true,
            },
          },
        },
      },
    },
  });

  if (!discount) {
    return logAndRespond(`Discount ${discountId} not found. Skipping...`);
  }

  if (!discount.autoProvisionEnabledAt) {
    return logAndRespond(
      `Discount ${discountId} does not have auto-provision enabled. Skipping...`,
    );
  }

  const { program } = discount;
  const { workspace } = program;

  if (!workspace.stripeConnectId) {
    return logAndRespond(
      `Workspace ${workspace.id} does not have stripeConnectId set. Skipping...`,
    );
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      discountId: discount.id,
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      id: true,
      partnerId: true,
      discountId: true,
      links: {
        select: {
          id: true,
        },
        where: {
          discountCode: null,
          partnerGroupDefaultLinkId: {
            not: null,
          },
        },
      },
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
    take: CRON_BATCH_SIZE,
  });

  if (programEnrollments.length === 0) {
    return logAndRespond(
      `No more program enrollments found for discount ${discountId}.`,
    );
  }

  const links = programEnrollments.flatMap(({ links }) => links);

  await enqueueBatchJobs(
    links.map((link) => ({
      queueName: "create-discount-code",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create`,
      deduplicationId: `${discountId}-${link.id}-1`,
      body: {
        linkId: link.id,
      },
    })),
  );

  if (programEnrollments.length === CRON_BATCH_SIZE) {
    const startingAfter = programEnrollments[programEnrollments.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
      method: "POST",
      body: {
        discountId,
        startingAfter,
      },
    });

    return logAndRespond(
      `Queued next batch for discount ${discountId} (startingAfter: ${startingAfter}).`,
    );
  }

  return logAndRespond(`Finished queuing jobs for discount ${discountId}.`);
});
