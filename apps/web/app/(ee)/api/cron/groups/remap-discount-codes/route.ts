import { createDiscountCode } from "@/lib/api/discounts/create-discount-code";
import { deleteDiscountCodes } from "@/lib/api/discounts/delete-discount-code";
import { isDiscountEquivalent } from "@/lib/api/discounts/is-discount-equivalent";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { DiscountCode } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
  groupId: z.string(),
  partnerIds: z.array(z.string()),
  isGroupDeleted: z.boolean().optional(),
});

// POST /api/cron/groups/remap-discount-codes
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerIds, groupId, isGroupDeleted } = inputSchema.parse(
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

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    include: {
      discount: true,
    },
  });

  if (!group) {
    return logAndRespond("Group not found.");
  }

  const discountCodes = programEnrollments.flatMap(
    ({ discountCodes }) => discountCodes,
  );

  // Find the discount codes to update and remove
  const discountCodesToUpdate: DiscountCode[] = [];
  const discountCodesToRemove: DiscountCode[] = [];

  for (const discountCode of discountCodes) {
    const keepDiscountCode = isDiscountEquivalent(
      group.discount,
      discountCode.discount,
    );

    if (keepDiscountCode) {
      discountCodesToUpdate.push(discountCode);
    } else {
      discountCodesToRemove.push(discountCode);
    }
  }

  // Update the discount codes to use the new discount if they are equivalent
  if (discountCodesToUpdate.length > 0) {
    console.log(
      `Found ${discountCodesToUpdate.length} discount codes equivalent to the new group's discount. Updating them.`,
    );

    await prisma.discountCode.updateMany({
      where: {
        id: {
          in: discountCodesToUpdate.map(({ id }) => id),
        },
      },
      data: {
        discountId: group.discount?.id,
      },
    });
  }

  // Remove the previous discount codes
  if (discountCodesToRemove.length > 0) {
    console.log(
      `Found ${discountCodesToRemove.length} discount codes not equivalent to the new group's discount. Deleting them.`,
    );

    await deleteDiscountCodes(discountCodesToRemove);
  }

  if (group.discount?.autoProvisionEnabledAt) {
    // Find the partner default links that don't have a discount code yet
    const links = await prisma.link.findMany({
      where: {
        partnerId: {
          in: partnerIds,
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
        programEnrollment: {
          select: {
            partner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (links.length > 0) {
      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          defaultProgramId: programId,
        },
        select: {
          stripeConnectId: true,
        },
      });

      // Create discount code for the partner default links
      if (workspace.stripeConnectId) {
        for (const link of links) {
          await createDiscountCode({
            stripeConnectId: workspace.stripeConnectId,
            partner: link.programEnrollment!.partner,
            link,
            discount: group.discount,
          });
        }
      }
    }
  }

  // if the group is deleted, need to check if there are any remaining discount codes, if not, delete the discount
  if (isGroupDeleted && oldDiscount) {
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
