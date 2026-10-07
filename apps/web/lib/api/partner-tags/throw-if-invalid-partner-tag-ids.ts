import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export async function throwIfInvalidPartnerTagIds({
  programId,
  partnerTagIds,
}: {
  programId: string;
  partnerTagIds: string[] | null | undefined;
}) {
  if (!partnerTagIds || partnerTagIds.length === 0) {
    return [];
  }

  const partnerTags = await prisma.partnerTag.findMany({
    where: {
      programId,
      id: {
        in: partnerTagIds,
      },
    },
    select: {
      id: true,
    },
  });

  const invalidPartnerTagIds = partnerTagIds.filter(
    (partnerTagId) => !partnerTags.some((tag) => tag.id === partnerTagId),
  );

  if (invalidPartnerTagIds.length) {
    throw new DubApiError({
      message: `Invalid partner tag IDs detected: ${invalidPartnerTagIds.join(", ")}`,
      code: "bad_request",
    });
  }

  return partnerTags;
}
