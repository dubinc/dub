import { createDiscountCodeForLinkJob } from "@/lib/jobs/handlers/create-discount-code-for-link-job";
import { remapDiscountCodeJob } from "@/lib/jobs/handlers/remap-discount-code-job";
import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";
import { Discount } from "@prisma/client";

// Remap existing codes and enqueue missing default-link codes for partners in a program
export async function syncDiscountCodes({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  partnerIds = [...new Set(partnerIds)];

  if (partnerIds.length === 0) {
    return;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      partnerId: true,
      discount: true,
    },
  });

  if (programEnrollments.length === 0) {
    console.info(
      `No program enrollments found for program ${programId}. Skipping discount code sync...`,
    );
    return;
  }

  const enrolledPartnerIds = pluck(programEnrollments, "partnerId");

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      programId,
      partnerId: {
        in: enrolledPartnerIds,
      },
      disabledAt: null,
    },
    select: {
      id: true,
    },
  });

  if (discountCodes.length === 0) {
    console.info(
      `No discount codes found for ${enrolledPartnerIds.length} partners in program ${programId}. Skipping remap jobs...`,
    );
  } else {
    await remapDiscountCodeJob.dispatchBatch(
      discountCodes.map(({ id }) => ({
        discountCodeId: id,
      })),
    );
  }

  await enqueueMissingDiscountCodes({
    programId,
    enrollments: programEnrollments,
  });
}

// Find default links that do not have a discount code assigned to them and enqueue a job to create one
export async function enqueueMissingDiscountCodes({
  programId,
  enrollments,
}: {
  programId: string;
  enrollments: {
    partnerId: string;
    discount: Pick<Discount, "autoProvisionEnabledAt"> | null;
  }[];
}) {
  if (enrollments.length === 0) {
    return;
  }

  const enrollmentDiscountByPartnerId = new Map(
    enrollments.map((enrollment) => [
      enrollment.partnerId,
      enrollment.discount,
    ]),
  );

  const links = await prisma.link.findMany({
    where: {
      partnerId: {
        in: pluck(enrollments, "partnerId"),
      },
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
      partnerId: true,
      linkReward: {
        select: {
          discount: {
            select: {
              autoProvisionEnabledAt: true,
            },
          },
        },
      },
    },
  });

  const linksToProvision = links.filter((link) => {
    if (!link.partnerId) {
      return false;
    }

    const enrollmentDiscount = enrollmentDiscountByPartnerId.get(
      link.partnerId,
    );

    const discount = link.linkReward?.discount ?? enrollmentDiscount ?? null;

    return Boolean(discount?.autoProvisionEnabledAt);
  });

  if (linksToProvision.length === 0) {
    return;
  }

  await createDiscountCodeForLinkJob.dispatchBatch(
    linksToProvision.map((link) => ({
      linkId: link.id,
    })),
  );
}
