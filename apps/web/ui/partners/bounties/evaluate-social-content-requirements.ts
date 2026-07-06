import { resolveBountyDetails } from "@/lib/bounty/utils";
import {
  PartnerBountyProps,
  PartnerPlatformProps,
  SocialContent,
} from "@/lib/types";
import { isBefore } from "date-fns/isBefore";

export function evaluateSocialContentRequirements({
  content,
  bounty,
  partnerPlatforms,
}: {
  content?: SocialContent | null;
  bounty: Pick<PartnerBountyProps, "startsAt" | "submissionRequirements">;
  partnerPlatforms?: Pick<
    PartnerPlatformProps,
    "identifier" | "verifiedAt" | "type"
  >[];
}) {
  const bountyInfo = resolveBountyDetails(bounty);
  const bountySocialPlatform = bountyInfo?.socialPlatform?.value;
  const contentHandle = content?.handle?.toLowerCase();

  const verifiedPlatforms = partnerPlatforms?.filter(
    (platform) => platform.type === bountySocialPlatform && platform.verifiedAt,
  );

  // The content must be posted from one of the partner's verified handles
  const hasVerifiedMatchingHandle = verifiedPlatforms?.some(
    (platform) => platform.identifier.toLowerCase() === contentHandle,
  );

  const isPostedFromYourAccount = !!content && !!hasVerifiedMatchingHandle;

  const isAfterStartDate =
    !!content?.publishedAt &&
    !!bounty.startsAt &&
    !isBefore(content.publishedAt, bounty.startsAt);

  return {
    isPostedFromYourAccount,
    isAfterStartDate,
  };
}
