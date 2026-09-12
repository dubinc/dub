const LINKEDIN_PHOTO_ASSET_ID_RE = /\/dms\/image(?:\/v2)?\/([^/?]+)\//;

export function normalizeLinkedInName(name: string | null | undefined) {
  if (!name) {
    return null;
  }

  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

export function linkedinPhotoFingerprint(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  return url.match(LINKEDIN_PHOTO_ASSET_ID_RE)?.[1] ?? null;
}

export function linkedInProfilesMatch({
  oauthName,
  oauthPicture,
  scrapedName,
  scrapedImage,
}: {
  oauthName: string | null | undefined;
  oauthPicture: string | null | undefined;
  scrapedName: string | null | undefined;
  scrapedImage: string | null | undefined;
}) {
  const name = normalizeLinkedInName(oauthName);
  const scraped = normalizeLinkedInName(scrapedName);
  const oauthPhoto = linkedinPhotoFingerprint(oauthPicture);
  const scrapedPhoto = linkedinPhotoFingerprint(scrapedImage);

  return Boolean(
    name &&
      scraped &&
      name === scraped &&
      oauthPhoto &&
      scrapedPhoto &&
      oauthPhoto === scrapedPhoto,
  );
}
