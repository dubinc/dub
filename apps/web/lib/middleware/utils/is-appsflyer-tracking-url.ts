export const isAppsFlyerTrackingUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.endsWith(".onelink.me");
  } catch (error) {
    return false;
  }
};
