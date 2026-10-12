/** Allowed origins for Domain Connect SyncUX / signed apply redirects. */
export const ALLOWED_SYNC_UX_ORIGINS = [
  "https://vercel.com",
  "https://dash.cloudflare.com",
] as const;

/** True when `url` (SyncUX or apply URL) has an allowlisted origin. */
export function isAllowedSyncUXOrigin(url: string): boolean {
  try {
    return (ALLOWED_SYNC_UX_ORIGINS as readonly string[]).includes(
      new URL(url).origin,
    );
  } catch {
    return false;
  }
}
