import { getUrlObjFromString } from "@dub/utils";

export const isGoogleAdsClick = ({
  url,
  referer,
}: {
  url: string;
  referer: string | null;
}) => {
  const urlObj = getUrlObjFromString(url);

  // Check for Google Ads parameters
  if (urlObj) {
    const { searchParams } = urlObj;

    const hasGoogleAdsParams =
      searchParams.has("gclid") ||
      searchParams.has("gad_source") ||
      searchParams.has("gad_campaignid");

    if (hasGoogleAdsParams) {
      return true;
    }
  }

  // Check the referer
  if (referer) {
    return referer.includes("google");
  }

  return false;
};
