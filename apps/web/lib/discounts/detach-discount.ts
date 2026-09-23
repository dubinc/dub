import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { invalidateLinksForDiscountsJob } from "../jobs/handlers/invalidate-links-for-discounts-job";
import { remapDiscountCodeJob } from "../jobs/handlers/remap-discount-code-job";

type DetachDiscountParams = {
  programId: string;
  discountId: string;
};

const BATCH_SIZE = 500;

// Detach discount from program enrollments
export async function detachDiscountFromProgramEnrollments({
  programId,
  discountId,
}: DetachDiscountParams) {
  let startAfterId: string | null = null;

  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    select: {
      id: true,
      partnerGroup: {
        select: {
          discountId: true,
        },
      },
    },
  });

  if (!discount) {
    console.info(`Discount ${discountId} not found. Skipping...`);
    return;
  }

  // Restore enrollments to the owning group's current default, or clear them
  // if this discount was the group default
  const groupDiscountId = discount.partnerGroup?.discountId ?? null;
  const restoredDiscountId =
    groupDiscountId !== discount.id ? groupDiscountId : null;

  while (true) {
    const where: Prisma.ProgramEnrollmentWhereInput = {
      discountId,
      ...(startAfterId
        ? {
            id: {
              gt: startAfterId,
            },
          }
        : {}),
    };

    const enrollments = await prisma.programEnrollment.findMany({
      where,
      select: {
        id: true,
        partnerId: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (enrollments.length === 0) {
      break;
    }

    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: pluck(enrollments, "id"),
        },
        discountId,
      },
      data: {
        discountId: restoredDiscountId,
      },
    });

    await invalidateLinksForDiscountsJob.dispatch(
      {
        type: "partners",
        programId,
        partnerIds: pluck(enrollments, "partnerId"),
      },
      {
        label: discountId,
      },
    );

    startAfterId = enrollments[enrollments.length - 1].id;

    if (enrollments.length < BATCH_SIZE) {
      break;
    }
  }
}

// Detach discount from link rewards
export async function detachDiscountFromLinkRewards({
  discountId,
}: DetachDiscountParams) {
  let startAfterId: string | null = null;

  while (true) {
    const where: Prisma.LinkRewardWhereInput = {
      discountId,
      ...(startAfterId && {
        id: {
          gt: startAfterId,
        },
      }),
    };

    const linkRewards = await prisma.linkReward.findMany({
      where,
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (linkRewards.length === 0) {
      break;
    }

    await prisma.linkReward.updateMany({
      where: {
        id: {
          in: pluck(linkRewards, "id"),
        },
        discountId,
      },
      data: {
        discountId: null,
      },
    });

    startAfterId = linkRewards[linkRewards.length - 1].id;

    if (linkRewards.length < BATCH_SIZE) {
      break;
    }
  }
}

// Dispatch per-code remap jobs for codes still pointing at this discount
export async function syncDiscountCodes({ discountId }: DetachDiscountParams) {
  let startAfterId: string | null = null;

  while (true) {
    const where: Prisma.DiscountCodeWhereInput = {
      discountId,
      disabledAt: null,
      ...(startAfterId && {
        id: {
          gt: startAfterId,
        },
      }),
    };

    const discountCodes = await prisma.discountCode.findMany({
      where,
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (discountCodes.length === 0) {
      break;
    }

    await remapDiscountCodeJob.dispatchBatch(
      discountCodes.map(({ id }) => ({
        discountCodeId: id,
      })),
    );

    startAfterId = discountCodes[discountCodes.length - 1].id;

    if (discountCodes.length < BATCH_SIZE) {
      break;
    }
  }
}
