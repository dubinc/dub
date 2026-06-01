import { isStaleDiscountVersion } from "@/lib/api/discounts/discount-version";
import {
  discountJobSchema,
  queueDiscountProcessing,
} from "@/lib/api/discounts/queue-discount-processing";
import { withCron } from "@/lib/cron/with-cron";
import { INACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/discounts/process
export const POST = withCron(async ({ rawBody }) => {
  const input = discountJobSchema.parse(JSON.parse(rawBody));

  const {
    event,
    groupId,
    version,
    batchNumber,
    discountSnapshot,
    startAfterProgramEnrollmentId,
  } = input;

  const { id: discountId } = discountSnapshot;

  const discount = await prisma.discount.findUnique({
    where: {
      id: discountId,
    },
    select: {
      id: true,
    },
  });

  if (!discount) {
    return logAndRespond(`Discount ${discountId} not found. Skipping...`);
  }

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      id: true,
    },
  });

  if (!group) {
    return logAndRespond(`Group ${groupId} not found. Skipping...`);
  }

  const isStaleVersion = await isStaleDiscountVersion({
    version,
    groupId,
  });

  if (isStaleVersion) {
    return logAndRespond(
      "Discount changed while processing. Skipping stale discount evaluation.",
    );
  }

  let data: Prisma.ProgramEnrollmentUpdateManyArgs["data"] | undefined =
    undefined;

  switch (event) {
    case "discount-created":
      data = { discountId: discount.id };
      break;

    case "discount-deleted":
      data = { discountId: null };
      break;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      groupId: group.id,
      status: {
        notIn: INACTIVE_ENROLLMENT_STATUSES,
      },
      ...(startAfterProgramEnrollmentId && {
        id: {
          gt: startAfterProgramEnrollmentId,
        },
      }),
    },
    select: {
      id: true,
    },
    orderBy: {
      id: "asc",
    },
    take: 300,
  });

  if (programEnrollments.length > 0) {
    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        ...data,
      },
    });

    const startingAfter = programEnrollments[programEnrollments.length - 1].id;

    await queueDiscountProcessing({
      ...input,
      startAfterProgramEnrollmentId: startingAfter,
      batchNumber: batchNumber + 1,
    });

    return logAndRespond(
      `Enqueued next batch (${batchNumber + 1}) for discount ${discountId} for the group ${groupId}.`,
    );
  }

  // No more program enrollments found, hard delete the discount
  if (event === "discount-deleted") {
    const discountCodes = await prisma.discountCode.count({
      where: {
        discountId: discount.id,
      },
    });

    if (discountCodes > 0) {
      return logAndRespond(
        `Found ${discountCodes} discount codes for discount ${discountId}. Skipping hard delete...`,
      );
    }

    try {
      await prisma.discount.delete({
        where: {
          id: discount.id,
        },
      });
    } catch (error) {
      // Treat already-deleted discount as success so retries can complete
      if (!(error.code === "P2025")) {
        throw new Error(
          `Failed to hard delete discount ${discount.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return logAndRespond(
    `Finished processing discount ${discountId} for the group ${groupId}.`,
  );
});
