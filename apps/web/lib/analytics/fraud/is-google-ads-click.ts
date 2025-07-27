import { getUrlObjFromString } from "@dub/utils";

export const isGoogleAdsClick = (url: string) => {
  const urlObj = getUrlObjFromString(url);

  if (!urlObj) {
    return false;
  }

  if (urlObj.searchParams.has("gclid")) {
    return true;
  }

  return false;
};
