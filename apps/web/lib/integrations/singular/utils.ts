export const isSingularTrackingUrl = (url: string | null | undefined) => {
  if (!url) {
    return false;
  }

  return url.endsWith(".sng.link");
};
