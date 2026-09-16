import { prisma } from "@/lib/prisma";
import { Discount, DiscountCode } from "@prisma/client";
import { deleteDiscountCodes } from "./delete-discount-code";
import { isDiscountEquivalent } from "./is-discount-equivalent";

type DiscountCodeWithDiscount = DiscountCode & {
  discount: Discount | null;
};

export async function remapDiscountCodes({
  discountCodes,
  newDiscount,
}: {
  discountCodes: DiscountCodeWithDiscount[];
  newDiscount: Discount | null | undefined;
}) {
  if (discountCodes.length === 0) {
    return;
  }

  const discountCodesToUpdate: DiscountCode[] = [];
  const discountCodesToRemove: DiscountCodeWithDiscount[] = [];

  for (const discountCode of discountCodes) {
    const keepDiscountCode = isDiscountEquivalent(
      newDiscount,
      discountCode.discount,
    );

    if (keepDiscountCode) {
      discountCodesToUpdate.push(discountCode);
    } else {
      discountCodesToRemove.push(discountCode);
    }
  }

  // Update the discount codes to use the new discount if they are equivalent
  if (discountCodesToUpdate.length > 0 && newDiscount) {
    console.log(
      `Found ${discountCodesToUpdate.length} discount codes equivalent to the new discount. Updating them.`,
    );

    await prisma.discountCode.updateMany({
      where: {
        id: {
          in: discountCodesToUpdate.map(({ id }) => id),
        },
      },
      data: {
        discountId: newDiscount.id,
      },
    });
  }

  // Remove the previous discount codes
  if (discountCodesToRemove.length > 0) {
    console.log(
      `Found ${discountCodesToRemove.length} discount codes not equivalent to the new discount. Deleting them.`,
    );

    await deleteDiscountCodes(discountCodesToRemove);
  }
}
