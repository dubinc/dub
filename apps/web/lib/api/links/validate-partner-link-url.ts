import { PartnerGroupAdditionalLink } from "@/lib/types";
import { getApexDomain } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { DubApiError } from "../errors";

export const validatePartnerLinkUrl = ({
  group,
  url,
}: {
  group: Pick<PartnerGroup, "additionalLinks"> | null;
  url?: string | null;
}) => {
  if (!url || !group) {
    return;
  }

  if (!group.additionalLinks) {
    throw new DubApiError({
      code: "bad_request",
      message: "No additional links are allowed for this program.",
    });
  }

  const additionalLinks = group.additionalLinks as PartnerGroupAdditionalLink[];

  // Find matching additional link based on its validation mode
  const matchFound = additionalLinks.find((additionalLink) => {
    if (additionalLink.urlValidationMode === "exact") {
      return additionalLink.url === url;
    } else if (additionalLink.urlValidationMode === "domain") {
      return getApexDomain(additionalLink.url) === getApexDomain(url);
    }

    return false;
  });

  if (!matchFound) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL (${url}) does not match any of the program's additional links.`,
    });
  }

  return matchFound;
};
