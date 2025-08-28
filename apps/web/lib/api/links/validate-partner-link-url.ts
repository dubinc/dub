import { AdditionalPartnerLink } from "@/lib/types";
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

  const additionalLinks = group.additionalLinks as AdditionalPartnerLink[];

  // Matching additional link
  const additionalLink = additionalLinks.find(
    (additionalLink) =>
      getApexDomain(additionalLink.url) === getApexDomain(url),
  );

  if (!additionalLink) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL (${url}) does not match any of the additional links.`,
    });
  }

  if (
    additionalLink.urlValidationMode === "domain" &&
    getApexDomain(additionalLink.url) !== getApexDomain(url)
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL domain (${getApexDomain(url)}) does not match the program's domain (${getApexDomain(url)}).`,
    });
  }

  if (
    additionalLink.urlValidationMode === "exact" &&
    additionalLink.url !== url
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL (${url}) does not match the program's URL (${additionalLink.url}).`,
    });
  }

  return true;
};
