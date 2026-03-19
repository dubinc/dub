import { PartnerBountyProps, SocialContent } from "@/lib/types";
import { isBefore } from "date-fns";

type DateLike = Date | string | null | undefined;

export type SocialRequirementPartnerPlatform = {
  identifier: string;
  verifiedAt: DateLike;
};

function toValidDate(value: DateLike) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function socialContentRequirementChecks({
  content,
  bounty,
  partnerPlatform,
}: {
  content: SocialContent | null | undefined;
  bounty: Pick<PartnerBountyProps, "startsAt">;
  partnerPlatform: SocialRequirementPartnerPlatform | undefined;
}) {
  const isPostedFromYourAccount =
    !!content &&
    !!partnerPlatform &&
    !!toValidDate(partnerPlatform.verifiedAt) &&
    !!content.handle &&
    partnerPlatform.identifier.toLowerCase() === content.handle.toLowerCase();

  const publishedAt = toValidDate(content?.publishedAt);
  const startsAt = toValidDate(bounty.startsAt);

  const isAfterStartDate =
    !!publishedAt && !!startsAt && !isBefore(publishedAt, startsAt);

  return {
    isPostedFromYourAccount,
    isAfterStartDate,
  };
}
