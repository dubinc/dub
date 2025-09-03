import { prisma } from "@dub/prisma";
import { PartnerGroup } from "@dub/prisma/client";
import { DubApiError } from "../errors";

export async function throwIfInvalidGroupIds({
  programId,
  groupIds,
}: {
  programId: string;
  groupIds: string[] | null;
}) {
  let partnerGroups: PartnerGroup[] = [];

  if (groupIds && groupIds.length) {
    partnerGroups = await prisma.partnerGroup.findMany({
      where: {
        programId,
        id: {
          in: groupIds,
        },
      },
    });

    const invalidGroupIds = groupIds?.filter(
      (groupId) => !partnerGroups?.some((group) => group.id === groupId),
    );

    if (invalidGroupIds?.length) {
      throw new DubApiError({
        message: `Invalid group IDs detected: ${invalidGroupIds.join(", ")}`,
        code: "bad_request",
      });
    }
  }

  return partnerGroups;
}
