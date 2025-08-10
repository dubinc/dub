import { getUrlObjFromString } from "@dub/utils";

export const isGoogleAdsClick = ({
  url,
  referer,
}: {
  url: string;
  referer: string | null;
}): {
  googleAdsClick: boolean;
  parameters: Record<string, string> | null;
} => {
  const urlObj = getUrlObjFromString(url);

  // Check for Google Ads parameters
  if (urlObj) {
    const { searchParams } = urlObj;

    const hasGoogleAdsParams =
      searchParams.has("gclid") ||
      searchParams.has("gad_source") ||
      searchParams.has("gad_campaignid");

    if (hasGoogleAdsParams) {
      const gclid = searchParams.get("gclid");
      const gadSource = searchParams.get("gad_source");
      const gadCampaignId = searchParams.get("gad_campaignid");

      return {
        googleAdsClick: true,
        parameters: {
          ...(gclid && { gclid }),
          ...(gadSource && { gad_source: gadSource }),
          ...(gadCampaignId && { gad_campaignid: gadCampaignId }),
        },
      };
    }
  }

  // Check the referer
  if (referer) {
    return {
      googleAdsClick: referer.includes("google"),
      parameters: {
        referer,
      },
    };
  }

  return {
    googleAdsClick: false,
    parameters: null,
  };
};
