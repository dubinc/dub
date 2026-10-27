import {
  PartnerBountyProps,
  PartnerPlatformProps,
  SocialContent,
} from "@/lib/types";
import { isBefore } from "date-fns/isBefore";

export function evaluateSocialContentRequirements({
  content,
  bounty,
  partnerPlatform,
}: {
  content?: SocialContent | null;
  bounty: Pick<PartnerBountyProps, "startsAt">;
  partnerPlatform?: Pick<PartnerPlatformProps, "identifier" | "verifiedAt">;
}) {
  const isPostedFromYourAccount =
    !!content &&
    !!partnerPlatform &&
    !!partnerPlatform.verifiedAt &&
    partnerPlatform.identifier.toLowerCase() === content.handle?.toLowerCase();

  const isAfterStartDate =
    !!content?.publishedAt &&
    !!bounty.startsAt &&
    !isBefore(content.publishedAt, bounty.startsAt);

  return {
    isPostedFromYourAccount,
    isAfterStartDate,
  };
}
