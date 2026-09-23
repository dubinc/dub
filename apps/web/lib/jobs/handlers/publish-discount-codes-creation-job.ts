import { CRON_BATCH_SIZE } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { isNonRecoverableDiscountError } from "@/lib/discounts/discount-error";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  discountId: z.string(),
  startingAfter: z.string().optional(),
});

// Page enrollments for a discount and enqueue per-link create-discount-code jobs
export const publishDiscountCodesCreationJob = defineJob({
  name: "publish-discount-codes-creation-job",
  schema: inputSchema,
  async handle({ discountId, startingAfter }) {
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
                shopifyStoreId: true,
              },
            },
          },
        },
      },
    });

    if (!discount) {
      console.info(`Discount ${discountId} not found. Skipping...`);
      return;
    }

    if (!discount.programId) {
      console.info(`Discount ${discountId} is soft-deleted. Skipping...`);
      return;
    }

    if (!discount.autoProvisionEnabledAt) {
      console.info(
        `Discount ${discountId} does not have auto-provision enabled. Skipping...`,
      );
      return;
    }

    const { program } = discount;

    if (!program) {
      console.info(`Discount ${discountId} has no program. Skipping...`);
      return;
    }

    const discountProvider = getDiscountProvider(discount.provider);

    try {
      await discountProvider.assertDiscountIntegration({
        workspace: program.workspace,
      });
    } catch (error) {
      if (isNonRecoverableDiscountError(error)) {
        console.warn(error.message);
        return;
      }

      throw error;
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
      console.info(
        `No more program enrollments found for discount ${discountId}.`,
      );
      return;
    }

    const links = programEnrollments.flatMap(({ links }) => links);

    if (links.length > 0) {
      await enqueueBatchJobs(
        links.map((link) => ({
          queueName: "create-discount-code",
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create`,
          deduplicationId: `${discountId}-${link.id}`,
          body: {
            linkId: link.id,
          },
        })),
      );
    }

    if (programEnrollments.length === CRON_BATCH_SIZE) {
      const startingAfter =
        programEnrollments[programEnrollments.length - 1].id;

      await publishDiscountCodesCreationJob.dispatch(
        { discountId, startingAfter },
        { label: discountId },
      );

      console.info(
        `Queued next batch for discount ${discountId} (startingAfter: ${startingAfter}).`,
      );
      return;
    }

    console.info(`Finished queuing jobs for discount ${discountId}.`);
  },
});
