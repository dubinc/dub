export function getPartnerContentThumbnailUrl(thumbnailUrl: string | null) {
  if (!thumbnailUrl) return null;

  if (isInstagramCdnUrl(thumbnailUrl)) {
    return `/api/partner-content/thumbnail?url=${encodeURIComponent(thumbnailUrl)}`;
  }

  return thumbnailUrl;
}

export function isInstagramCdnUrl(url: string) {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return (
      hostname === "cdninstagram.com" ||
      hostname.endsWith(".cdninstagram.com") ||
      (hostname.endsWith(".fbcdn.net") && hostname.startsWith("instagram."))
    );
  } catch {
    return false;
  }
}
