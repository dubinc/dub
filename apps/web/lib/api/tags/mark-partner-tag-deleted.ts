import { prisma } from "@dub/prisma";
import { queuePartnerTagDeletion } from "./queue-tag-deletion";

// Mark the partner tag as deleted (orphan from program). ProgramPartnerTag
// rows and the PartnerTag row are removed asynchronously via a cron job.
export async function markPartnerTagDeleted({
  partnerTagId,
  programId,
}: {
  partnerTagId: string;
  programId: string;
}): Promise<boolean> {
  try {
    const updated = await prisma.partnerTag.update({
      where: {
        id: partnerTagId,
        programId,
      },
      data: {
        programId: null,
      },
    });

    if (!updated) {
      return false;
    }

    await queuePartnerTagDeletion({
      partnerTagId,
    });

    return true;
  } catch (error) {
    console.error("markPartnerTagDeleted", {
      reason: error,
      partnerTagId,
      programId,
    });
    return false;
  }
}
