import { PartnerGroupAdditionalLink } from "@/lib/types";
import { getUrlObjFromString } from "@dub/utils";
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

  const additionalLinks = group.additionalLinks as PartnerGroupAdditionalLink[];

  if (!additionalLinks) {
    throw new DubApiError({
      code: "bad_request",
      message: "You cannot create additional links for this program.",
    });
  }

  const { hostname: urlHostname } = getUrlObjFromString(url) ?? {};

  // Find matching additional link based on its domain
  const additionalLink = additionalLinks.find((additionalLink) => {
    return additionalLink.domain === urlHostname;
  });

  if (!additionalLink) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL's domain (${urlHostname}) does not match the program's link domains.`,
    });
  }

  // Check the validation mode
  if (additionalLink.validationMode === "exact") {
    // For exact mode, compare the full URL
    if (additionalLink.url && url !== additionalLink.url) {
      throw new DubApiError({
        code: "bad_request",
        message: `The provided URL does not match the exact URL configured for this program: ${additionalLink.url}`,
      });
    } else if (!additionalLink.url) {
      // Legacy support: if no URL is set but mode is exact, only allow domain root
      const { pathname: urlPathname } = getUrlObjFromString(url) ?? {};
      if (urlPathname && urlPathname.slice(1).length > 0) {
        throw new DubApiError({
          code: "bad_request",
          message: `The provided URL is not an exact match for the program's link domain (${additionalLink.domain}).`,
        });
      }
    }
  }

  return true;
};
