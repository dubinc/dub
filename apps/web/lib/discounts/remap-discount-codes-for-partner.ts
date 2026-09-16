import { prisma } from "@/lib/prisma";
import { ProgramEnrollment } from "@prisma/client";
import {
  deleteDiscountCodes,
  DeleteDiscountCodesParams,
} from "./delete-discount-code";
import { isDiscountEquivalent } from "./is-discount-equivalent";

export async function remapDiscountCodesForPartner({
  programId,
  partnerId,
}: Pick<ProgramEnrollment, "programId" | "partnerId">) {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      id: true,
      discount: true,
    },
  });

  if (!programEnrollment) {
    console.log(
      `Program enrollment not found for partner ${partnerId} and program ${programId}. Skipping...`,
    );
    return;
  }

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      programId,
      partnerId,
      disabledAt: null,
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

  if (discountCodes.length === 0) {
    console.log(
      `No discount codes found for partner ${partnerId} and program ${programId}. Skipping...`,
    );
    return;
  }

  const discountCodesToDelete: DeleteDiscountCodesParams[] = [];

  for (const discountCode of discountCodes) {
    const existingDiscount = discountCode.discount;
    const newDiscount =
      discountCode.link?.linkReward?.discount ?? programEnrollment.discount;

    // No discount exists for this discount code, delete it
    if (!newDiscount) {
      discountCodesToDelete.push(discountCode);
      continue;
    }

    // The discount is already the correct one, skip
    if (existingDiscount?.id === newDiscount.id) {
      continue;
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
      continue;
    }

    // The discounts are different, delete the discount code
    discountCodesToDelete.push(discountCode);
  }

  if (discountCodesToDelete.length > 0) {
    await deleteDiscountCodes(discountCodesToDelete);
  }

  // TODO:
  // Create discount codes for the partner default links don't have a discount code yet
}
