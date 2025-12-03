export const isGooglePlayStoreUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === "play.google.com";
  } catch (error) {
    return false;
  }
};
