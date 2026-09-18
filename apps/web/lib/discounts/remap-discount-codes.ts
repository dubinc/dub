import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Discount, ProgramEnrollment } from "@prisma/client";
import { deleteDiscountCodes } from "./delete-discount-code";
import { isDiscountEquivalent } from "./is-discount-equivalent";

// Remap discount codes for a partner in a program
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
  }

  const enrollmentDiscount = programEnrollment.discount;
  const discountCodesToDelete: (typeof discountCodes)[number][] = [];

  for (const discountCode of discountCodes) {
    const existingDiscount = discountCode.discount;
    const linkDiscount = discountCode.link?.linkReward?.discount;

    // Prefer the link discount if it exists, otherwise use the enrollment discount
    const newDiscount = linkDiscount ?? enrollmentDiscount;

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

  await enqueueMissingDiscountCodes({
    programId,
    partnerId,
    enrollmentDiscount,
  });
}

// Find default links that do not have a discount code assigned to them and enqueue a job to create one
async function enqueueMissingDiscountCodes({
  programId,
  partnerId,
  enrollmentDiscount,
}: Pick<ProgramEnrollment, "programId" | "partnerId"> & {
  enrollmentDiscount: Pick<Discount, "autoProvisionEnabledAt"> | null;
}) {
  if (!enrollmentDiscount?.autoProvisionEnabledAt) {
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

  await enqueueBatchJobs(
    links.map((link) => ({
      queueName: "create-discount-code",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create`,
      deduplicationId: link.id,
      body: {
        linkId: link.id,
      },
    })),
  );
}
