import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  userAgent,
} from "next/server";
import { detectBot, getFinalUrl, parse } from "#/lib/middleware/utils";
import { ratelimit, redis } from "#/lib/upstash";
import { recordClick } from "#/lib/tinybird";
import { DUB_HEADERS, LOCALHOST_GEO_DATA, LOCALHOST_IP } from "../constants";
import { ipAddress } from "@vercel/edge";
import { isBlacklistedReferrer } from "../edge-config";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  const { domain, fullKey: key } = parse(req);

  if (!domain || !key) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "development" && domain === "dub.sh") {
    if (
      key === "github" &&
      (await isBlacklistedReferrer(req.headers.get("referer")))
    ) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
    const ip = ipAddress(req) || LOCALHOST_IP;
    const { success } = await ratelimit(
      10,
      key === "github" ? "1 d" : "10 s",
    ).limit(`${ip}:${domain}:${key}`);

    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const inspectMode = key.endsWith("+");

  const response = await redis.get<{
    url: string;
    password?: boolean;
    proxy?: boolean;
    rewrite?: boolean;
    iframeable?: boolean;
    ios?: string;
    android?: string;
    geo?: object;
  }>(
    // if inspect mode is enabled, remove the trailing `+` from the key
    `${domain}:${inspectMode ? key.slice(0, -1) : key}`,
  );

  const {
    url: target,
    password,
    proxy,
    rewrite,
    iframeable,
    ios,
    android,
    geo,
  } = response || {};

  if (target) {
    // only show inspect model if the link is not password protected
    if (inspectMode && !password) {
      return NextResponse.rewrite(
        new URL(`/inspect/${domain}/${encodeURIComponent(key)}`, req.url),
      );
    }

    // special case for link health monitoring with planetfall.io :)
    if (!req.headers.get("dub-no-track")) {
      ev.waitUntil(recordClick(domain, req, key)); // track the click only if there is no `dub-no-track` header
    }

    if (password) {
      // rewrite to auth page (/protected/[domain]/[key]) if the link is password protected
      return NextResponse.rewrite(
        new URL(`/protected/${domain}/${encodeURIComponent(key)}`, req.url),
      );
    }

    const isBot = detectBot(req);

    const { country } =
      process.env.VERCEL === "1" && req.geo ? req.geo : LOCALHOST_GEO_DATA;

    // rewrite to target URL if link cloaking is enabled
    if (rewrite) {
      if (iframeable) {
        return NextResponse.rewrite(
          new URL(`/rewrite/${target}`, req.url),
          DUB_HEADERS,
        );
      } else {
        // if link is not iframeable, use Next.js rewrite instead
        return NextResponse.rewrite(decodeURIComponent(target), DUB_HEADERS);
      }

      // rewrite to proxy page (/_proxy/[domain]/[key]) if it's a bot and proxy is enabled
    } else if (isBot && proxy) {
      return NextResponse.rewrite(
        new URL(`/proxy/${domain}/${encodeURIComponent(key)}`, req.url),
      );

      // redirect to iOS link if it is specified and the user is on an iOS device
    } else if (ios && userAgent(req).os?.name === "iOS") {
      return NextResponse.redirect(getFinalUrl(ios, { req }), DUB_HEADERS);

      // redirect to Android link if it is specified and the user is on an Android device
    } else if (android && userAgent(req).os?.name === "Android") {
      return NextResponse.redirect(getFinalUrl(android, { req }), DUB_HEADERS);

      // redirect to geo-specific link if it is specified and the user is in the specified country
    } else if (geo && country && country in geo) {
      return NextResponse.redirect(
        getFinalUrl(geo[country], { req }),
        DUB_HEADERS,
      );

      // regular redirect
    } else {
      return NextResponse.redirect(getFinalUrl(target, { req }), DUB_HEADERS);
    }
  } else {
    // short link not found, redirect to root
    return NextResponse.redirect(new URL("/", req.url), DUB_HEADERS);
  }
}
