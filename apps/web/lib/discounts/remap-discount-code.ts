import { prisma } from "@/lib/prisma";
import { deleteDiscountCodes } from "./delete-discount-code";
import { isDiscountEquivalent } from "./is-discount-equivalent";

// Remap a single discount code to the partner's current enrollment/link discount
export async function remapDiscountCode({
  discountCodeId,
}: {
  discountCodeId: string;
}) {
  const discountCode = await prisma.discountCode.findUnique({
    where: {
      id: discountCodeId,
    },
    include: {
      discount: true,
      link: {
        select: {
          id: true,
          linkReward: {
            select: {
              discount: true,
            },
          },
        },
      },
    },
  });

  if (!discountCode) {
    console.info(
      `Discount code ${discountCodeId} not found. Skipping remap...`,
    );
    return;
  }

  if (discountCode.disabledAt) {
    console.info(
      `Discount code ${discountCodeId} is disabled. Skipping remap...`,
    );
    return;
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: discountCode.partnerId,
        programId: discountCode.programId,
      },
    },
    select: {
      discount: true,
    },
  });

  if (!programEnrollment) {
    console.info(
      `Program enrollment not found for partner ${discountCode.partnerId} and program ${discountCode.programId}. Skipping remap of discount code ${discountCodeId}...`,
    );
    return;
  }

  const existingDiscount = discountCode.discount;

  // Prefer the link discount if it exists, otherwise use the enrollment discount
  const newDiscount =
    discountCode.link?.linkReward?.discount ?? programEnrollment.discount;

  // No discount exists for this discount code, delete it
  if (!newDiscount) {
    await deleteDiscountCodes([discountCode]);
    return;
  }

  // The discount is already the correct one, skip
  if (existingDiscount?.id === newDiscount.id) {
    return;
  }

  const isEquivalent = isDiscountEquivalent(newDiscount, existingDiscount);

  // The discounts are equivalent, update the discount code to use the new discount
  if (isEquivalent) {
    await prisma.discountCode.updateMany({
      where: {
        id: discountCode.id,
      },
      data: {
        discountId: newDiscount.id,
      },
    });
    return;
  }

  // The discounts are different, delete the discount code
  await deleteDiscountCodes([discountCode]);
}
