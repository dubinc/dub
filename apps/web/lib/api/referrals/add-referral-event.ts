import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

type ReferralEventType =
  | "referral.created"
  | "referral.qualified"
  | "referral.unqualified"
  | "referral.closedWon"
  | "referral.closedLost";

interface AddReferralEventInput
  extends Pick<
    Prisma.PartnerReferralEventUncheckedCreateInput,
    "referralId" | "type" | "note" | "userId"
  > {
  type: ReferralEventType;
}

export async function addReferralEvent({
  referralId,
  type,
  note,
  userId,
}: AddReferralEventInput) {
  return prisma.partnerReferralEvent.create({
    data: {
      referralId,
      type,
      note,
      userId,
    },
  });
}
