import { isGooglePlayStoreUrl } from "./is-google-play-store-url";
import { isIosAppStoreUrl } from "./is-ios-app-store-url";

export type InAppBrowserSource = "instagram" | "facebook" | "tiktok";

export function shouldEscapeInAppBrowser({
  userAgentString,
  destinationUrl,
}: {
  userAgentString: string | null | undefined;
  destinationUrl: string;
}): InAppBrowserSource | null {
  const isStoreUrl =
    isIosAppStoreUrl(destinationUrl) || isGooglePlayStoreUrl(destinationUrl);
  if (!isStoreUrl) return null;

  if (!userAgentString) {
    return null;
  }

  if (/\bInstagram\b/i.test(userAgentString)) {
    return "instagram";
  }

  if (/\bFBAN\b|\bFBAV\b|\bFB_IAB\b/i.test(userAgentString)) {
    return "facebook";
  }

  if (/musical_ly|\bTikTok\b|\bBytedanceWebview\b/i.test(userAgentString)) {
    return "tiktok";
  }

  return null;
}

export function getInAppBrowserEscapeUrl({
  reqUrl,
  destinationUrl,
  source,
  domain,
  key,
}: {
  reqUrl: string;
  destinationUrl: string;
  source: InAppBrowserSource;
  domain: string;
  key: string;
}): URL {
  const escapeUrl = new URL(
    `/in-app-browser/${encodeURIComponent(destinationUrl)}`,
    reqUrl,
  );
  escapeUrl.searchParams.set("source", source);
  escapeUrl.searchParams.set("domain", domain);
  escapeUrl.searchParams.set("key", key);
  return escapeUrl;
}
