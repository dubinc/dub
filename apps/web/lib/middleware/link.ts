import { recordClick } from "@/lib/tinybird";
import { formatRedisLink, ratelimit, redis } from "@/lib/upstash";
import {
  DUB_HEADERS,
  LEGAL_PROJECT_ID,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
} from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  userAgent,
} from "next/server";
import { isBlacklistedReferrer } from "../edge-config";
import { getLinkViaEdge } from "../planetscale";
import { RedisLinkProps } from "../types";
import { detectBot, getFinalUrl, parse, urlToDeeplink } from "./utils";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  let { domain, fullKey: key } = parse(req);

  if (!domain || !key) {
    return NextResponse.next();
  }

  // links on Dub are case insensitive by default
  key = key.toLowerCase();

  if (
    process.env.NODE_ENV !== "development" &&
    domain === "dub.sh" &&
    key === "try"
  ) {
    if (await isBlacklistedReferrer(req.headers.get("referer"))) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
    const ip = ipAddress(req) || LOCALHOST_IP;
    const { success } = await ratelimit(10, "1 d").limit(
      `${ip}:${domain}:${key}`,
    );

    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const inspectMode = key.endsWith("+");
  // if inspect mode is enabled, remove the trailing `+` from the key
  if (inspectMode) {
    key = key.slice(0, -1);
  }

  let link = await redis.hget<RedisLinkProps>(domain, key);

  if (!link) {
    const linkData = await getLinkViaEdge(domain, key);

    if (!linkData) {
      // short link not found, redirect to root
      // TODO: log 404s (https://github.com/dubinc/dub/issues/559)
      return NextResponse.redirect(new URL("/", req.url), DUB_HEADERS);
    }

    // format link to fit the RedisLinkProps interface
    link = await formatRedisLink(linkData as any);

    ev.waitUntil(
      redis.hset(domain, {
        [key]: link,
      }),
    );
  }

  let {
    id,
    url,
    password,
    proxy,
    rewrite,
    iframeable,
    expiresAt,
    ios,
    android,
    geo,
  } = link;

  url = getFinalUrl({ url, req });

  // only show inspect modal if the link is not password protected
  if (inspectMode && !password) {
    return NextResponse.rewrite(
      new URL(`/inspect/${domain}/${encodeURIComponent(key)}+`, req.url),
    );
  }

  // if the link is password protected
  if (password) {
    const pw = req.nextUrl.searchParams.get("pw");

    // rewrite to auth page (/protected/[domain]/[key]) if:
    // - no `pw` param is provided
    // - the `pw` param is incorrect
    // this will also ensure that no clicks are tracked unless the password is correct
    if (!pw || (await getLinkViaEdge(domain, key))?.password !== pw) {
      return NextResponse.rewrite(
        new URL(`/protected/${domain}/${encodeURIComponent(key)}`, req.url),
      );
    }
  }

  // if the link is banned
  if (link.projectId === LEGAL_PROJECT_ID) {
    return NextResponse.rewrite(new URL("/banned", req.url));
  }

  // if the link has expired
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return NextResponse.rewrite(new URL("/expired", req.url));
  }

  const searchParams = req.nextUrl.searchParams;
  // only track the click when there is no `dub-no-track` header or query param
  if (
    !(
      req.headers.get("dub-no-track") ||
      searchParams.get("dub-no-track") === "1"
    )
  ) {
    ev.waitUntil(recordClick({ req, id, url }));
  }

  const isBot = detectBot(req);

  const { country } =
    process.env.VERCEL === "1" && req.geo ? req.geo : LOCALHOST_GEO_DATA;

  // rewrite to proxy page (/proxy/[domain]/[key]) if it's a bot and proxy is enabled
  if (isBot && proxy) {
    return NextResponse.rewrite(
      new URL(`/proxy/${domain}/${encodeURIComponent(key)}`, req.url),
    );

    // rewrite to target URL if link cloaking is enabled
  } else if (rewrite) {
    if (iframeable) {
      return NextResponse.rewrite(
        new URL(`/rewrite/${encodeURIComponent(url)}`, req.url),
        DUB_HEADERS,
      );
    } else {
      // if link is not iframeable, use Next.js rewrite instead
      return NextResponse.rewrite(url, DUB_HEADERS);
    }

    // redirect to iOS link if it is specified and the user is on an iOS device
  } else if (userAgent(req).os?.name === "iOS") {
    if (ios) {
      return NextResponse.redirect(getFinalUrl({ url: ios, req }), DUB_HEADERS);
    }

    const deepLink = urlToDeeplink(url);
    if (deepLink !== url) {
      return NextResponse.rewrite(
        new URL(`/deeplink/${encodeURIComponent(url)}`, req.url),
        DUB_HEADERS,
      );
    }

    // redirect to Android link if it is specified and the user is on an Android device
  } else if (userAgent(req).os?.name === "Android") {
    if (android) {
      return NextResponse.redirect(
        getFinalUrl({ url: android, req }),
        DUB_HEADERS,
      );
    }

    const deepLink = urlToDeeplink(url);
    if (deepLink !== url) {
      return NextResponse.rewrite(
        new URL(`/deeplink/${encodeURIComponent(url)}`, req.url),
        DUB_HEADERS,
      );
    }

    // redirect to geo-specific link if it is specified and the user is in the specified country
  } else if (geo && country && country in geo) {
    return NextResponse.redirect(
      getFinalUrl({ url: geo[country], req }),
      DUB_HEADERS,
    );

    // regular redirect
  } else {
    return NextResponse.redirect(url, DUB_HEADERS);
  }
}
