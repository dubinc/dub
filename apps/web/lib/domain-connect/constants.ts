export const DUB_CUSTOM_DOMAIN_A_RECORD = "76.76.21.21";
export const DUB_CUSTOM_DOMAIN_CNAME = "cname.dub.co";
export const DOMAIN_CONNECT_PROVIDER_ID = "dub.co";
export const DOMAIN_CONNECT_KEY_HOST = "_dck1";
export const DEFAULT_DC_SERVICE_APEX = "links-apex";
export const DEFAULT_DC_SERVICE_SUBDOMAIN = "links-subdomain";
export const DEFAULT_DC_SERVICE_EMAIL = "email";

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
