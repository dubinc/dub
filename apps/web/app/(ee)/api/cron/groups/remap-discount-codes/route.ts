import { withCron } from "@/lib/cron/with-cron";
import { remapDiscountCodesForPartnerJob } from "@/lib/jobs/handlers/remap-discount-codes-for-partner-job";
import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
  groupId: z.string(),
  partnerIds: z.array(z.string()),
});

// POST /api/cron/groups/remap-discount-codes
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerIds, groupId } = inputSchema.parse(
    JSON.parse(rawBody),
  );

  if (partnerIds.length === 0) {
    return logAndRespond("No partner IDs provided.");
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
    },
    include: {
      discountCodes: {
        include: {
          discount: true,
        },
      },
    },
  });

  const oldDiscount = programEnrollments[0]?.discountCodes[0]?.discount;

  if (programEnrollments.length === 0) {
    return logAndRespond("No program enrollments found.");
  }

  const partnerGroup = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      id: true,
    },
  });

  if (!partnerGroup) {
    return logAndRespond("Group not found.");
  }

  // Remap existing codes and enqueue missing default-link codes per partner.
  await remapDiscountCodesForPartnerJob.dispatchBatch(
    partnerIds.map((partnerId) => ({
      programId,
      partnerId,
    })),
    ({ partnerId }) => ({
      label: partnerId,
    }),
  );

  // if the group is deleted, need to check if there are any remaining discount codes, if not, delete the discount
  if (oldDiscount) {
    const remainingDiscountCodes = await prisma.discountCode.count({
      where: {
        discountId: oldDiscount.id,
      },
    });
    if (remainingDiscountCodes === 0) {
      await prisma.discount.deleteMany({
        where: {
          id: oldDiscount.id,
        },
      });
      console.log(
        `Deleted discount ${oldDiscount.id} because it has no remaining discount codes.`,
      );
    }
  }

  return logAndRespond("Finished remapping discount codes for the group.");
});
