import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { isDiscountDeleted } from "@/lib/discounts/is-discount-deleted";
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

  if (isDiscountDeleted(discount)) {
    console.info(`Discount ${discountId} is soft-deleted. Skipping...`);
    return null;
  }

  if (!discount.defaultForPartnerGroup) {
    console.info(
      `Discount ${discountId} is not a group-level discount. Skipping...`,
    );
    return null;
  }

  const groupId = discount.defaultForPartnerGroup.id;

  // Inheritors only: no discount yet, or still on a soft-deleted discount
  // owned by this group. Live partner-level overrides stay put.
  const inheritingEnrollmentWhere = {
    OR: [
      { discountId: null },
      {
        discount: {
          is: {
            programId: null,
            groupId,
          },
        },
      },
    ],
  };

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId,
      ...inheritingEnrollmentWhere,
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
    const enrollmentIds = pluck(enrollments, "id");

    // Re-check liveness inside the transaction so a concurrent soft-delete
    // (clears PartnerGroup.discountId / Discount.programId) cannot stamp this id
    const count = await prisma.$transaction(async (tx) => {
      const stillValid = await tx.discount.findFirst({
        where: {
          id: discount.id,
          programId: {
            not: null,
          },
          defaultForPartnerGroup: {
            is: {
              id: groupId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!stillValid) {
        return null;
      }

      const { count } = await tx.programEnrollment.updateMany({
        where: {
          id: {
            in: enrollmentIds,
          },
          groupId,
          ...inheritingEnrollmentWhere,
          partnerGroup: {
            discountId: discount.id,
          },
        },
        data: {
          discountId: discount.id,
        },
      });

      // Only stamp codes for enrollments that still point at this discount
      // (skips partners who received a partner-level override mid-batch)
      await tx.discountCode.updateMany({
        where: {
          discountId: null,
          programEnrollment: {
            id: {
              in: enrollmentIds,
            },
            discountId: discount.id,
          },
        },
        data: {
          discountId: discount.id,
        },
      });

      return count;
    });

    if (count === null) {
      console.info(
        `Discount ${discount.id} is no longer the group default. Skipping...`,
      );
      return null;
    }

    console.info(
      `Attached discount ${discount.id} to ${count} enrollments in group ${groupId}.`,
    );
  }

  if (enrollments.length === PRISMA_UPDATEMANY_LIMIT) {
    return {
      hasMore: true,
    };
  }

  // Final liveness check before side effects (invalidate / auto-provision)
  const stillValid = await prisma.discount.findFirst({
    where: {
      id: discount.id,
      programId: {
        not: null,
      },
      defaultForPartnerGroup: {
        is: {
          id: groupId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!stillValid) {
    console.info(
      `Discount ${discount.id} is no longer the group default. Skipping...`,
    );
    return null;
  }

  await Promise.all([
    invalidateLinksForDiscountsJob.dispatch(
      {
        by: "discount",
        programId: discount.programId!,
        discountId: discount.id,
      },
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
