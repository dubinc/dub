export const isGoogleAdsClick = ({
  url,
  referrer,
}: {
  url: string;
  referrer: string;
}) => {
  const urlObj = new URL(url);

  if (!urlObj.search) {
    return false;
  }

  const urlParams = new URLSearchParams(urlObj.search);

  if (urlParams.has("gclid")) {
    return true;
  }

  if (referrer?.includes("google.com")) {
    return true;
  }

  const utmSource = urlParams.get("utm_source");

  if (utmSource === "google") {
    return true;
  }

  return false;
};
