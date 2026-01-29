import { createDiscountCode } from "@/lib/api/discounts/create-discount-code";
import { isDiscountEquivalent } from "@/lib/api/discounts/is-discount-equivalent";
import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { DiscountCode } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  partnerIds: z.array(z.string()),
  groupId: z.string(),
});

// POST /api/cron/groups/remap-discount-codes
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerIds, groupId } = schema.parse(JSON.parse(rawBody));

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
      links: {
        select: {
          id: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
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
    await prisma.discountCode.deleteMany({
      where: {
        id: {
          in: discountCodesToRemove.map(({ id }) => id),
        },
      },
    });

    await queueDiscountCodeDeletion(discountCodesToRemove);

    // Create new discount codes if the auto-provision is enabled for the discount
    if (group.discount?.autoProvisionEnabledAt) {
      const partners = programEnrollments.flatMap(({ links, partner }) =>
        links.map((link) => ({ link, partner })),
      );

      console.log("partners", partners);

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

  return logAndRespond(
    `Updated ${discountCodesToUpdate.length} discount codes and removed ${discountCodesToRemove.length} discount codes.`,
  );
});
