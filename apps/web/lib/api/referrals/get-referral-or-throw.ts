import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

interface GetReferralOrThrowParams {
  referralId: string;
  programId: string;
}

export const getReferralOrThrow = async ({
  referralId,
  programId,
}: GetReferralOrThrowParams) => {
  const referral = await prisma.partnerReferral.findUnique({
    where: {
      id: referralId,
    },
    include: {
      customer: true,
    },
  });

  if (!referral) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner referral not found.",
    });
  }

  if (referral.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: "You don't have access to this partner referral.",
    });
  }

  return referral;
};
