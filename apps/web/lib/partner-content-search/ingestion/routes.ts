import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// Partners per enumerate page (default 500). Override via env to exercise the
// self-continuation chain locally without seeding 500+ partners.
export const PARTNER_CONTENT_ENUMERATE_PAGE_SIZE = (() => {
  const raw = process.env.PARTNER_CONTENT_ENUMERATE_PAGE_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 500;
})();
export const PARTNER_CONTENT_INCREMENTAL_REFRESH_DAYS = 7;

export const PARTNER_CONTENT_EMBED_FLOW_CONTROL = {
  key: "partner-content-embed-voyage",
  parallelism: 20,
  rate: 600,
  period: "1m",
} as const;

export const PARTNER_CONTENT_SEARCH_ROUTES = {
  enumerate: "/api/cron/partner-content/enumerate",
  enumeratePage: "/api/cron/partner-content/enumerate/page",
  fetch: "/api/cron/partner-content/fetch",
  transcript: "/api/cron/partner-content/transcript",
  embed: "/api/cron/partner-content/embed",
} as const;

export type PartnerContentSearchRoute =
  (typeof PARTNER_CONTENT_SEARCH_ROUTES)[keyof typeof PARTNER_CONTENT_SEARCH_ROUTES];

export function createPartnerContentRunStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function getPartnerContentUrl(route: PartnerContentSearchRoute) {
  return `${APP_DOMAIN_WITH_NGROK}${route}`;
}

export function createPartnerContentDeduplicationId(
  ...parts: Array<string | number | undefined>
) {
  return parts
    .filter((part): part is string | number => part !== undefined)
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("-");
}
