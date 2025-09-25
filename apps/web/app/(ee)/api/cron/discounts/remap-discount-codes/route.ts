import {
  isDiscountEquivalent,
  queueDiscountCodeDeletion,
} from "@/lib/api/discounts/queue-discount-code-deletion";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  partnerIds: z.array(z.string()),
  groupId: z.string(),
});

// POST /api/cron/discounts/remap-discount-codes
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { programId, partnerIds, groupId } = schema.parse(
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

    const discountCodesToUpdate: string[] = [];
    const discountCodesToRemove: string[] = [];

    for (const discountCode of discountCodes) {
      const keepDiscountCode = isDiscountEquivalent(
        group.discount,
        discountCode.discount,
      );

      if (keepDiscountCode) {
        discountCodesToUpdate.push(discountCode.id);
      } else {
        discountCodesToRemove.push(discountCode.id);
      }
    }

    console.log({ discountCodesToUpdate, discountCodesToRemove });

    // Update the discount codes to use the new discount
    if (discountCodesToUpdate.length > 0) {
      await prisma.discountCode.updateMany({
        where: {
          id: {
            in: discountCodesToUpdate,
          },
        },
        data: {
          discountId: group.discount?.id,
        },
      });
    }

    // Remove the discount codes from the group
    if (discountCodesToRemove.length > 0) {
      await Promise.allSettled(
        discountCodesToRemove.map((discountCodeId) =>
          queueDiscountCodeDeletion(discountCodeId),
        ),
      );
    }

    return logAndRespond(
      `Updated ${discountCodesToUpdate.length} discount codes and removed ${discountCodesToRemove.length} discount codes.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
