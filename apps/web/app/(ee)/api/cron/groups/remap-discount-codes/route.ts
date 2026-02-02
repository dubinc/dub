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
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      links: {
        select: {
          id: true,
        },
        where: {
          partnerGroupDefaultLinkId: {
            not: null,
          },
        },
      },
      discountCodes: {
        include: {
          discount: true,
        },
      },
    },
  });

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
      `Found ${discountCodesToUpdate.length} discount codes which share the same discount as the previous group. Updating them to use the new discount.`,
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

  // Remove the old discount codes
  if (discountCodesToRemove.length > 0) {
    console.log(
      `Found ${discountCodesToRemove.length} discount codes which do not share the same discount as the previous group. Deleting them.`,
    );

    await deleteDiscountCodes(discountCodesToRemove);

    // Create new discount codes if the auto-provision is enabled for the discount
    if (group.discount?.autoProvisionEnabledAt) {
      const partners = programEnrollments.flatMap(({ links, partner }) =>
        links.map((link) => ({ link, partner })),
      );

      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          defaultProgramId: programId,
        },
        select: {
          stripeConnectId: true,
        },
      });

      if (workspace.stripeConnectId) {
        for (const { link, partner } of partners) {
          await createDiscountCode({
            stripeConnectId: workspace.stripeConnectId,
            partner,
            link,
            discount: group.discount,
          });
        }
      }
    }
  }

  return logAndRespond("Finished remapping discount codes for the group.");
});
