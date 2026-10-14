import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export async function throwIfInvalidPartnerTags({
  programId,
  partnerTagIds,
  partnerTagNames,
}: {
  programId: string;
  partnerTagIds?: string[] | null;
  partnerTagNames?: string[] | null;
}) {
  if (!partnerTagIds?.length && !partnerTagNames?.length) {
    return [];
  }

  // Ids are provided
  if (partnerTagIds && partnerTagIds.length > 0) {
    const uniqueTagIds = [...new Set(partnerTagIds)];

    const partnerTags = await prisma.partnerTag.findMany({
      where: {
        programId,
        id: {
          in: uniqueTagIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const invalidPartnerTagIds = uniqueTagIds.filter(
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

  // Names are provided
  if (partnerTagNames && partnerTagNames.length > 0) {
    const uniqueTagNames = [...new Set(partnerTagNames)];

    const partnerTags = await prisma.partnerTag.findMany({
      where: {
        programId,
        name: {
          in: uniqueTagNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const foundTagNames = new Set(
      partnerTags.map((tag) => tag.name.toLowerCase()),
    );

    const invalidTagNames = uniqueTagNames.filter(
      (tagName) => !foundTagNames.has(tagName.toLowerCase()),
    );

    if (invalidTagNames.length) {
      throw new DubApiError({
        message: `Invalid partner tag names detected: ${invalidTagNames.join(", ")}`,
        code: "bad_request",
      });
    }

    return partnerTags;
  }

  return [];
}
