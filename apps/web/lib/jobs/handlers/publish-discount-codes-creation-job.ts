import { CRON_BATCH_SIZE } from "@/lib/cron";
import { isNonRecoverableDiscountError } from "@/lib/discounts/discount-error";
import { getDiscountProvider } from "@/lib/discounts/discount-provider";
import { isDiscountDeleted } from "@/lib/discounts/is-discount-deleted";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { defineJob } from "../index";
import { createDiscountCodeForLinkJob } from "./create-discount-code-for-link-job";

const inputSchema = z.object({
  discountId: z.string(),
  startingAfter: z.string().optional(),
});

// Page default links for a discount and enqueue per-link create-discount-code-for-link jobs
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

    if (isDiscountDeleted(discount)) {
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

    // Get default links for the program
    const partnerLinks = await prisma.link.findMany({
      where: {
        programId: program.id,
        discountCode: null,
        partnerGroupDefaultLinkId: {
          not: null,
        },
        programEnrollment: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
        },
        OR: [
          {
            linkReward: {
              discountId,
            },
          },
          {
            programEnrollment: {
              discountId,
            },
          },
        ],
      },
      select: {
        id: true,
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

    if (partnerLinks.length === 0) {
      console.info(`No more links found for discount ${discountId}.`);
      return;
    }

    await createDiscountCodeForLinkJob.dispatchBatch(
      partnerLinks.map((link) => ({
        linkId: link.id,
      })),
    );

    if (partnerLinks.length === CRON_BATCH_SIZE) {
      const startingAfter = partnerLinks[partnerLinks.length - 1].id;

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
