import {
  LOCALHOST_IP,
  REDIRECTION_QUERY_PARAM,
} from "@dub/utils/src/constants";
import { getUrlFromStringIfValid } from "@dub/utils/src/functions";
import { ipAddress } from "@vercel/functions";
import { NextRequest, userAgent } from "next/server";
import { isGooglePlayStoreUrl } from "./is-google-play-store-url";
import { isSingularTrackingUrl } from "./is-singular-tracking-url";
import { parse } from "./parse";

export const getFinalUrl = (
  url: string,
  {
    req,
    clickId,
    via,
  }: {
    req: NextRequest;
    clickId?: string;
    via?: string;
  },
) => {
  // query is the query string (e.g. d.to/github?utm_source=twitter -> ?utm_source=twitter)
  const searchParams = req.nextUrl.searchParams;

  // if there is a redirection url set, then use it instead of the target url
  const redirectionUrl = getUrlFromStringIfValid(
    searchParams.get(REDIRECTION_QUERY_PARAM) ?? "",
  );

  // get the query params of the target url
  const urlObj = redirectionUrl ? new URL(redirectionUrl) : new URL(url);

  if (via) {
    urlObj.searchParams.set("via", via);
  }

  if (clickId) {
    /*
       custom query param for stripe payment links + Dub Conversions
       - if there is a clickId and dub_client_reference_id is 1
       - then set client_reference_id to dub_id_${clickId} and drop the dub_client_reference_id param
       - our Stripe integration will then detect `dub_id_${clickId}` as the dubClickId in the `checkout.session.completed` webhook
       - @see: https://github.com/dubinc/dub/blob/main/apps/web/app/(ee)/api/stripe/integration/webhook/checkout-session-completed.ts
    */
    if (urlObj.searchParams.get("dub_client_reference_id") === "1") {
      urlObj.searchParams.set("client_reference_id", `dub_id_${clickId}`);
      urlObj.searchParams.delete("dub_client_reference_id");

      // if there's a clickId and no dub-no-track search param, then add clickId to the final url
      // reasoning: if you're skipping tracking, there's no point in passing the clickId anyway
    } else if (!searchParams.has("dub-no-track")) {
      urlObj.searchParams.set("dub_id", clickId);
    }
  }

  // for Singular tracking links
  if (isSingularTrackingUrl(url)) {
    const ua = userAgent(req);
    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    urlObj.searchParams.set("cl", clickId ?? "");
    urlObj.searchParams.set("ua", ua?.ua ?? "");
    urlObj.searchParams.set("ip", ip ?? "");
  }

  // Polyfill wpcn & wpcl params for Singular integration
  const wpcn = urlObj.searchParams.get("wpcn");
  const wpcl = urlObj.searchParams.get("wpcl");

  if (wpcn && wpcn === "{via}") {
    urlObj.searchParams.set("wpcn", via ?? "");
  }

  if (wpcl && wpcl === "{dub_id}") {
    urlObj.searchParams.set("wpcl", clickId ?? "");
  }

  // for Google Play Store links
  if (isGooglePlayStoreUrl(url)) {
    const { shortLink, searchParamsString } = parse(req);
    const existingReferrer = urlObj.searchParams.get("referrer");

    const referrerSearchParam = new URLSearchParams(
      existingReferrer ? decodeURIComponent(existingReferrer) : "",
    );
    referrerSearchParam.set("deepLink", `${shortLink}${searchParamsString}`);
    urlObj.searchParams.set("referrer", referrerSearchParam.toString());
  }

  // if there are no query params, then return the target url as is (no need to parse it)
  // @ts-ignore – until https://github.com/microsoft/TypeScript/issues/54466 is fixed
  if (searchParams.size === 0) return urlObj.toString();

  // if searchParams (type: `URLSearchParams`) has the same key as target url, then overwrite it
  for (const [key, value] of searchParams) {
    // we will pass everything except internal query params (dub-no-track and redir_url)
    if (["dub-no-track", REDIRECTION_QUERY_PARAM].includes(key)) continue;
    urlObj.searchParams.set(key, value);
  }

  // remove qr param from the final url if the value is "1" (only used for detectQr function)
  if (urlObj.searchParams.get("qr") === "1") {
    urlObj.searchParams.delete("qr");
  }

  // remove skip_deeplink_preview param from the final url (only used for internal redirection behavior)
  if (urlObj.searchParams.get("skip_deeplink_preview") === "1") {
    urlObj.searchParams.delete("skip_deeplink_preview");
  }

  return urlObj.toString();
};
