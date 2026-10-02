import { DubApiError } from "../api/errors";
import { partnerTagDeletedJob } from "../jobs/handlers/partner-tag-deleted-job";
import { prisma } from "../prisma";

type DeletePartnerTagInput = {
  partnerTagId: string;
  programId: string;
};

export async function deletePartnerTag({
  partnerTagId,
  programId,
}: DeletePartnerTagInput) {
  // Soft delete
  const { count } = await prisma.partnerTag.updateMany({
    where: {
      id: partnerTagId,
      programId,
    },
    data: {
      programId: null,
    },
  });

  if (count === 0) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner tag not found.",
    });
  }

  await partnerTagDeletedJob.dispatch({
    partnerTagId,
  });
}
