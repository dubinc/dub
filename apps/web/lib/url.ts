export const isGoogleAdsClick = ({ url }: { url: string }) => {
  const urlObj = new URL(url);

  if (!urlObj.search) {
    return false;
  }

  const urlParams = new URLSearchParams(urlObj.search);

  if (urlParams.has("gclid")) {
    return true;
  }

  return false;
};
