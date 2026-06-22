export function getPartnerContentThumbnailUrl(thumbnailUrl: string | null) {
  if (!thumbnailUrl) return null;

  if (isInstagramCdnUrl(thumbnailUrl)) {
    return `/api/partner-content/thumbnail?url=${encodeURIComponent(thumbnailUrl)}`;
  }

  return thumbnailUrl;
}

export function isInstagramCdnUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "cdninstagram.com" ||
      hostname.endsWith(".cdninstagram.com") ||
      (hostname.endsWith(".fbcdn.net") && hostname.startsWith("instagram."))
    );
  } catch {
    return false;
  }
}
