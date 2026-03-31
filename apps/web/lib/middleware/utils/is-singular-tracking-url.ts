export const isSingularTrackingUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.endsWith(".sng.link");
  } catch (error) {
    return false;
  }
};
