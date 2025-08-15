"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updateDiscountSchema } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const updateDiscountAction = authActionClient
  .schema(updateDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { discountId, includedPartnerIds, excludedPartnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    includedPartnerIds = includedPartnerIds || [];
    excludedPartnerIds = excludedPartnerIds || [];

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

    // Update partners associated with the discount
    if (discount.default) {
      await updateDefaultDiscountPartners({
        programId,
        discountId,
        partnerIds: excludedPartnerIds,
      });
    } else {
      await updateNonDefaultDiscountPartners({
        programId,
        discountId,
        partnerIds: includedPartnerIds,
      });
    }

    waitUntil(
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
            metadata: discount,
          },
        ],
      }),
    );
  });

// Update default discount
const updateDefaultDiscountPartners = async ({
  programId,
  discountId,
  partnerIds,
}: {
  programId: string;
  discountId: string;
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
  programId,
  discountId,
  partnerIds,
}: {
  programId: string;
  discountId: string;
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
