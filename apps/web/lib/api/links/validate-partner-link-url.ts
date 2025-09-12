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

  const domain = getApexDomain(url);

  // Find matching additional link based on its domain
  const additionalLink = additionalLinks.find((additionalLink) => {
    return additionalLink.domain === domain;
  });

  if (!additionalLink) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL (${url}) does not match any of the program's additional link domains.`,
    });
  }

  // Check the validation mode
  if (additionalLink.validationMode === "exact") {
    if (url !== additionalLink.domain) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL (${url}) does not match the program's URL (${additionalLink.domain}).`,
      });
    }
  }

  if (additionalLink.validationMode === "domain") {
    if (domain !== additionalLink.domain) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL domain (${domain}) does not match the program's domain (${additionalLink.domain}).`,
      });
    }
  }

  return true;
};
