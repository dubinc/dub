import { prisma } from "@/lib/prisma";
import { ProgramEnrollment } from "@prisma/client";
import { createDiscountCode } from "./create-discount-code";
import { deleteDiscountCodes } from "./delete-discount-code";
import { isDiscountProviderError } from "./discount-error";
import { isDiscountEquivalent } from "./is-discount-equivalent";

export async function remapDiscountCodes({
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
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
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
    },
  });

  const newDiscount = programEnrollment.discount;
  const discountCodesToDelete: typeof discountCodes = [];

  for (const discountCode of discountCodes) {
    const existingDiscount = discountCode.discount;

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

  if (!newDiscount?.autoProvisionEnabledAt) {
    return;
  }

  const links = await prisma.link.findMany({
    where: {
      partnerId,
      programId,
      partnerGroupDefaultLinkId: {
        not: null,
      },
      discountCode: {
        is: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (links.length === 0) {
    return;
  }

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      defaultProgramId: programId,
    },
    select: {
      id: true,
      webhookEnabled: true,
      stripeConnectId: true,
      shopifyStoreId: true,
    },
  });

  for (const link of links) {
    try {
      await createDiscountCode({
        workspace,
        partner: programEnrollment.partner,
        link,
        discount: newDiscount,
      });
    } catch (error) {
      if (isDiscountProviderError(error)) {
        if (
          error.providerCode === "INTEGRATION_NOT_AVAILABLE" ||
          error.providerCode === "AUTH_EXPIRED" ||
          error.providerCode === "PERMISSIONS_REQUIRED" ||
          error.providerCode === "COUPON_NOT_FOUND"
        ) {
          console.warn(
            `${error.message} Skipping remaining discount code creation for remap.`,
          );
          break;
        }
      }

      console.error(
        `Failed to create discount code for link ${link.id}:`,
        error,
      );
    }
  }
}
