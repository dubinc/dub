import { PRISMA_UPDATEMANY_LIMIT, qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, pluck } from "@dub/utils";
import * as z from "zod/v4";
import { defineJob } from "../index";
import { invalidateLinksForDiscountsJob } from "./invalidate-links-for-discounts-job";

const inputSchema = z.object({
  discountId: z.string(),
});

// Attach a newly created default discount to enrollments and discount codes
// in the group (batched), then kick off cache invalidation and auto-provisioning.
export const attachDiscountJob = defineJob({
  name: "attach-discount-job",
  schema: inputSchema,
  async handle({ discountId }) {
    const discount = await prisma.discount.findUnique({
      where: {
        id: discountId,
      },
      select: {
        id: true,
        programId: true,
        groupId: true,
        autoProvisionEnabledAt: true,
      },
    });

    if (!discount) {
      console.info(`Discount ${discountId} not found. Skipping...`);
      return;
    }

    if (!discount.programId || !discount.groupId) {
      console.info(
        `Discount ${discountId} has no program or group. Skipping...`,
      );
      return;
    }

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: discount.groupId,
        discountId: null,
      },
      select: {
        id: true,
        partnerId: true,
      },
      take: PRISMA_UPDATEMANY_LIMIT,
      orderBy: {
        id: "asc",
      },
    });

    if (enrollments.length > 0) {
      const { count } = await prisma.programEnrollment.updateMany({
        where: {
          id: {
            in: pluck(enrollments, "id"),
          },
          groupId: discount.groupId,
          discountId: null,
        },
        data: {
          discountId: discount.id,
        },
      });

      console.info(
        `Attached discount ${discount.id} to ${count} enrollments in group ${discount.groupId}.`,
      );
    }

    if (enrollments.length === PRISMA_UPDATEMANY_LIMIT) {
      await attachDiscountJob.dispatch({ discountId }, { label: discountId });
      return;
    }

    // Finish up by invalidating links and queueing up auto-provisioning
    await Promise.all([
      invalidateLinksForDiscountsJob.dispatch(
        { type: "discount", discountId: discount.id },
        { label: discount.id },
      ),

      ...(discount.autoProvisionEnabledAt
        ? [
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create/queue-batches`,
              body: {
                discountId: discount.id,
              },
            }),
          ]
        : []),
    ]);
  },
});
