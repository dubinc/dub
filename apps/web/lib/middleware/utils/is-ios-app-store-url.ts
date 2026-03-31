export const isIosAppStoreUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === "apps.apple.com";
  } catch (error) {
    return false;
  }
};
