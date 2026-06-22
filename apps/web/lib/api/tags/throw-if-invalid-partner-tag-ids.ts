import { prisma } from "@/lib/prisma";
import { PartnerTag } from "@prisma/client";
import { DubApiError } from "../errors";

export async function throwIfInvalidPartnerTagIds({
  programId,
  partnerTagIds,
}: {
  programId: string;
  partnerTagIds: string[] | null | undefined;
}) {
  let partnerTags: PartnerTag[] = [];

  if (partnerTagIds && partnerTagIds.length) {
    partnerTags = await prisma.partnerTag.findMany({
      where: {
        programId,
        id: {
          in: partnerTagIds,
        },
      },
    });

    const invalidPartnerTagIds = partnerTagIds?.filter(
      (partnerTagId) => !partnerTags?.some((tag) => tag.id === partnerTagId),
    );

    if (invalidPartnerTagIds?.length) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `Invalid partner tag IDs detected: ${invalidPartnerTagIds.join(", ")}`,
      });
    }
  }

  return partnerTags;
}
