"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { Discount } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, deepEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let {
      discountId,
      amount,
      type,
      maxDuration,
      couponId,
      couponTestId,
      includedPartnerIds,
      excludedPartnerIds,
    } = parsedInput;

    includedPartnerIds = includedPartnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    const finalPartnerIds = [...includedPartnerIds, ...excludedPartnerIds];

    if (finalPartnerIds && finalPartnerIds.length > 0) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: finalPartnerIds,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const invalidPartnerIds = finalPartnerIds.filter(
        (id) => !programEnrollments.some(({ partnerId }) => partnerId === id),
      );

      if (invalidPartnerIds.length > 0) {
        throw new Error(
          `Invalid partner IDs provided: ${invalidPartnerIds.join(", ")}`,
        );
      }
    }

    let updatedDiscount: Discount | undefined = undefined;

    // Stripe doesn't support updating the standard coupon fields
    if (discount.provider !== "stripe") {
      updatedDiscount = await prisma.discount.update({
        where: {
          id: discountId,
        },
        data: {
          amount,
          type,
          maxDuration,
          couponId,
          couponTestId,
        },
      });
    }

    // Update partners associated with the discount
    if (discount.default) {
      await updateDefaultDiscountPartners({
        discountId,
        programId,
        partnerIds: excludedPartnerIds,
      });
    } else {
      await updateNonDefaultDiscountPartners({
        discountId,
        programId,
        partnerIds: includedPartnerIds,
      });
    }

    waitUntil(
      (async () => {
        let shouldExpireCache = false;

        if (updatedDiscount) {
          shouldExpireCache = !deepEqual(
            {
              amount: discount.amount,
              type: discount.type,
              maxDuration: discount.maxDuration,
            },
            {
              amount: updatedDiscount.amount,
              type: updatedDiscount.type,
              maxDuration: updatedDiscount.maxDuration,
            },
          );
        }

        await Promise.allSettled([
          shouldExpireCache
            ? qstash.publishJSON({
                url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
                body: {
                  discountId,
                  action: "discount-updated",
                },
              })
            : Promise.resolve(),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "discount.updated",
            description: `Discount ${discount.id} updated`,
            actor: user,
            targets: [
              {
                type: "discount",
                id: discount.id,
                metadata: updatedDiscount,
              },
            ],
          }),
        ]);
      })(),
    );
  });

// Update default discount
const updateDefaultDiscountPartners = async ({
  discountId,
  programId,
  partnerIds,
}: {
  discountId: string;
  programId: string;
  partnerIds: string[]; // Excluded partners
}) => {
  const existingPartners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      discountId: null,
    },
    select: {
      partnerId: true,
    },
  });

  const existingPartnerIds = existingPartners.map(({ partnerId }) => partnerId);

  const excludedPartnerIds = partnerIds.filter(
    (id) => !existingPartnerIds.includes(id),
  );

  const includedPartnerIds = existingPartnerIds.filter(
    (id) => !partnerIds.includes(id),
  );

  // Exclude partners from the default discount
  if (excludedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        partnerId: {
          in: excludedPartnerIds,
        },
      },
      data: {
        discountId: null,
      },
    });
  }

  // Include partners in the default discount
  if (includedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        discountId: null,
        partnerId: {
          in: includedPartnerIds,
        },
      },
      data: {
        discountId,
      },
    });
  }
};

// Update non-default discount
const updateNonDefaultDiscountPartners = async ({
  discountId,
  programId,
  partnerIds,
}: {
  discountId: string;
  programId: string;
  partnerIds: string[]; // Included partners
}) => {
  const existingPartners = await prisma.programEnrollment.findMany({
    where: {
      programId,
      discountId,
    },
    select: {
      partnerId: true,
    },
  });

  const existingPartnerIds = existingPartners.map(({ partnerId }) => partnerId);

  const includedPartnerIds = partnerIds.filter(
    (id) => !existingPartnerIds.includes(id),
  );

  const excludedPartnerIds = existingPartnerIds.filter(
    (id) => !partnerIds.includes(id),
  );

  // Include partners in the discount
  if (includedPartnerIds.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        partnerId: {
          in: includedPartnerIds,
        },
      },
      data: {
        discountId,
      },
    });
  }

  // Exclude partners from the discount
  if (excludedPartnerIds.length > 0) {
    const defaultDiscount = await prisma.discount.findFirst({
      where: {
        programId,
        default: true,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        programId,
        discountId,
        partnerId: {
          in: excludedPartnerIds,
        },
      },
      data: {
        // Replace the discount with the default discount if it exists
        discountId: defaultDiscount ? defaultDiscount.id : null,
      },
    });
  }
};
