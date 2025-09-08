export const getUtmListFromSearch = (): Record<string, string> | null => {
  const searchParams = new URLSearchParams(window.location.search);

  if (!searchParams.get("utm_source")) {
    return null;
  }

  return {
    utm_campaign_id: searchParams.get("utm_campaign_id") ?? "",
    utm_campaign: searchParams.get("utm_campaign") ?? "",
    utm_adgroup_id: searchParams.get("utm_adgroup_id") ?? "",
    utm_adgroup: searchParams.get("utm_adgroup") ?? "",
    utm_ad_id: searchParams.get("utm_ad_id") ?? "",
    utm_ad_name: searchParams.get("utm_ad_name") ?? "",
    utm_source: searchParams.get("utm_source") ?? "",
    utm_medium: searchParams.get("utm_medium") ?? "",
    utm_target_id: searchParams.get("utm_target_id") ?? "",
  };
};
