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

  for (const additionalLink of additionalLinks) {
    if (
      additionalLink.urlValidationMode === "domain" &&
      getApexDomain(additionalLink.url) === getApexDomain(url)
    ) {
      return;
    }

    if (
      additionalLink.urlValidationMode === "exact" &&
      additionalLink.url === url
    ) {
      return;
    }
  }

  throw new DubApiError({
    code: "bad_request",
    message: `The provided URL (${url}) does not match any of the additional links.`,
  });
};
