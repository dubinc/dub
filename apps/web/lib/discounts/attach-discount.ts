import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { invalidateLinksForDiscountsJob } from "../jobs/handlers/invalidate-links-for-discounts-job";
import { publishDiscountCodesCreationJob } from "../jobs/handlers/publish-discount-codes-creation-job";

// Attach a group-level discount to one batch of enrollments in the group.
// Returns whether more enrollments remain to attach.
export async function attachDiscount({
  discountId,
}: {
  discountId: string;
}): Promise<{ hasMore: boolean } | null> {
  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    select: {
      id: true,
      programId: true,
      autoProvisionEnabledAt: true,
      defaultForPartnerGroup: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!discount) {
    console.info(`Discount ${discountId} not found. Skipping...`);
    return null;
  }

  if (!discount.programId || !discount.defaultForPartnerGroup) {
    console.info(
      `Discount ${discountId} is not a group-level discount. Skipping...`,
    );
    return null;
  }

  const groupId = discount.defaultForPartnerGroup.id;

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId,
      discountId: null,
    },
    select: {
      id: true,
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
        groupId,
        discountId: null,
      },
      data: {
        discountId: discount.id,
      },
    });

    await prisma.discountCode.updateMany({
      where: {
        discountId: null,
        programEnrollment: {
          id: {
            in: pluck(enrollments, "id"),
          },
        },
      },
      data: {
        discountId: discount.id,
      },
    });

    console.info(
      `Attached discount ${discount.id} to ${count} enrollments in group ${groupId}.`,
    );
  }

  if (enrollments.length === PRISMA_UPDATEMANY_LIMIT) {
    return {
      hasMore: true,
    };
  }

  await Promise.all([
    invalidateLinksForDiscountsJob.dispatch(
      { type: "discount", discountId: discount.id },
      { label: discount.id },
    ),

    ...(discount.autoProvisionEnabledAt
      ? [
          publishDiscountCodesCreationJob.dispatch(
            { discountId: discount.id },
            { label: discount.id },
          ),
        ]
      : []),
  ]);

  return {
    hasMore: false,
  };
}
