import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { remapDiscountCodeJob } from "@/lib/jobs/handlers/remap-discount-code-job";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Discount, ProgramEnrollment } from "@prisma/client";
import { ACTIVE_ENROLLMENT_STATUSES } from "../zod/schemas/partners";

// Read discount codes for a partner in a program and fan out per-code remap jobs
export async function syncDiscountCodes({
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
      status: true,
      discount: true,
    },
  });

  if (!programEnrollment) {
    console.info(
      `Program enrollment not found for partner ${partnerId} and program ${programId}. Skipping...`,
    );
    return;
  }

  if (!ACTIVE_ENROLLMENT_STATUSES.includes(programEnrollment.status)) {
    console.info(
      `Program enrollment is not active for partner ${partnerId} and program ${programId}. Skipping...`,
    );
    return;
  }

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      programId,
      partnerId,
      disabledAt: null,
    },
    select: {
      id: true,
    },
  });

  if (discountCodes.length === 0) {
    console.info(
      `No discount codes found for partner ${partnerId} and program ${programId}. Skipping remap jobs...`,
    );
  } else {
    await remapDiscountCodeJob.dispatchBatch(
      discountCodes.map(({ id }) => ({
        discountCodeId: id,
      })),
      ({ discountCodeId }) => ({
        label: discountCodeId,
        deduplicationId: `remap-discount-code-${discountCodeId}`,
      }),
    );
  }

  await enqueueMissingDiscountCodes({
    programId,
    partnerId,
    enrollmentDiscount: programEnrollment.discount,
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
    const discount = link.linkReward?.discount ?? enrollmentDiscount;
    return Boolean(discount?.autoProvisionEnabledAt);
  });

  if (linksToProvision.length === 0) {
    return;
  }

  await enqueueBatchJobs(
    linksToProvision.map((link) => ({
      queueName: "create-discount-code",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discount-codes/create`,
      body: {
        linkId: link.id,
      },
    })),
  );
}
