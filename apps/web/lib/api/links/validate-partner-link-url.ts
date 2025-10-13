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

  const { hostname: urlHostname, pathname: urlPathname } =
    getUrlObjFromString(url) ?? {};

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

  if (additionalLink.validationMode === "domain") {
    return true;
  }

  if (
    additionalLink.domain !== urlHostname ||
    additionalLink.path !== urlPathname
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL does not match the URL configured for this program.`,
    });
  }

  return true;
};
