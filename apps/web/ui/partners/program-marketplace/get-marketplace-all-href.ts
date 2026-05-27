export function getMarketplaceAllHref(
  params?: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });
  }

  const queryString = searchParams.toString();

  return `/programs/marketplace/all${queryString ? `?${queryString}` : ""}`;
}
