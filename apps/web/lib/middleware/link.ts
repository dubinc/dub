import {
  createResponseWithCookie,
  detectBot,
  getFinalUrl,
  isSupportedDeeplinkProtocol,
  parse,
} from "@/lib/middleware/utils";
import { recordClick } from "@/lib/tinybird";
import { formatRedisLink } from "@/lib/upstash";
import {
  DUB_HEADERS,
  LEGAL_WORKSPACE_ID,
  LOCALHOST_GEO_DATA,
  LOCALHOST_IP,
  isDubDomain,
  isUnsupportedKey,
  nanoid,
  punyEncode,
} from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { cookies } from "next/headers";
import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  userAgent,
} from "next/server";
import { linkCache } from "../api/links/cache";
import { isCaseSensitiveDomain } from "../api/links/case-sensitivity";
import { clickCache } from "../api/links/click-cache";
import { getLinkViaEdge } from "../planetscale";
import { getDomainViaEdge } from "../planetscale/get-domain-via-edge";
import { hasEmptySearchParams } from "./utils/has-empty-search-params";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  let { domain, fullKey: originalKey } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  if (domain === "dev.buff.ly") {
    domain = "buff.ly";
  }

  // encode the key to ascii
  // links on Dub are case insensitive by default
  let key = punyEncode(originalKey);

  if (!isCaseSensitiveDomain(domain)) {
    key = key.toLowerCase();
  }

  const inspectMode = key.endsWith("+");
  // if inspect mode is enabled, remove the trailing `+` from the key
  if (inspectMode) {
    key = key.slice(0, -1);
  }

  // if key is empty string, set to _root (root domain link)
  if (key === "") {
    key = "_root";
  }

  // we don't support .php links (too much bot traffic)
  // hence we redirect to the root domain and add `dub-no-track` header to avoid tracking bot traffic
  if (isUnsupportedKey(key)) {
    return NextResponse.redirect(new URL("/?dub-no-track=1", req.url), {
      headers: {
        ...DUB_HEADERS,
        "X-Robots-Tag": "googlebot: noindex",
      },
      status: 302,
    });
  }

  let cachedLink = await linkCache.get({ domain, key });

  if (!cachedLink) {
    let linkData = await getLinkViaEdge({
      domain,
      key,
    });

    if (!linkData) {
      // TODO: remove this once everything is migrated over
      if (domain === "buff.ly") {
        return NextResponse.rewrite(
          new URL(`/api/links/crawl/bitly/${domain}/${key}`, req.url),
        );
      }

      // check if domain has notFoundUrl configured
      const domainData = await getDomainViaEdge(domain);
      if (domainData?.notFoundUrl) {
        return NextResponse.redirect(domainData.notFoundUrl, {
          headers: {
            ...DUB_HEADERS,
            "X-Robots-Tag": "googlebot: noindex",
            // pass the Referer value to the not found URL
            Referer: req.url,
          },
          status: 302,
        });
      } else {
        return NextResponse.rewrite(new URL(`/${domain}/not-found`, req.url), {
          headers: DUB_HEADERS,
        });
      }
    }

    // format link to fit the RedisLinkProps interface
    cachedLink = formatRedisLink(linkData as any);
    // cache in Redis
    ev.waitUntil(linkCache.set(linkData as any));
  }

  const {
    id: linkId,
    url,
    password,
    trackConversion,
    proxy,
    rewrite,
    expiresAt,
    ios,
    android,
    geo,
    expiredUrl,
    doIndex,
    webhookIds,
    projectId: workspaceId,
  } = cachedLink;

  // by default, we only index default dub domain links (e.g. dub.sh)
  // everything else is not indexed by default, unless the user has explicitly set it to be indexed
  const shouldIndex = isDubDomain(domain) || doIndex === true;

  // only show inspect modal if the link is not password protected
  if (inspectMode && !password) {
    return NextResponse.rewrite(
      new URL(`/inspect/${domain}/${encodeURIComponent(key)}+`, req.url),
      {
        headers: {
          ...DUB_HEADERS,
          ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
        },
      },
    );
  }

  // if the link is password protected
  if (password) {
    const pw =
      req.nextUrl.searchParams.get("pw") ||
      req.cookies.get(`dub_password_${linkId}`)?.value;

    // rewrite to auth page (/password/[domain]/[key]) if:
    // - no `pw` param is provided
    // - the `pw` param is incorrect
    // this will also ensure that no clicks are tracked unless the password is correct
    if (!pw || (await getLinkViaEdge({ domain, key }))?.password !== pw) {
      return NextResponse.rewrite(new URL(`/password/${linkId}`, req.url), {
        headers: {
          ...DUB_HEADERS,
          ...(!shouldIndex && {
            "X-Robots-Tag": "googlebot: noindex",
          }),
        },
      });
    } else if (pw) {
      // strip it from the URL if it's correct
      req.nextUrl.searchParams.delete("pw");
    }
  }

  // if the link is banned
  if (workspaceId === LEGAL_WORKSPACE_ID) {
    return NextResponse.rewrite(new URL("/banned", req.url), {
      headers: {
        ...DUB_HEADERS,
        ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
      },
    });
  }

  // if the link has expired
  if (expiresAt && new Date(expiresAt) < new Date()) {
    if (expiredUrl) {
      return NextResponse.redirect(expiredUrl, {
        headers: {
          ...DUB_HEADERS,
          ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
        },
        status: 302,
      });
    } else {
      return NextResponse.rewrite(new URL(`/expired/${domain}`, req.url), {
        headers: {
          ...DUB_HEADERS,
          ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
        },
      });
    }
  }

  const cookieStore = cookies();
  let clickId = cookieStore.get("dub_id")?.value;
  if (!clickId) {
    // if trackConversion is enabled, check if clickId is cached in Redis
    if (trackConversion) {
      const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

      clickId = (await clickCache.get({ domain, key, ip })) || undefined;
    }
    // if there's still no clickId, generate a new one
    if (!clickId) {
      clickId = nanoid(16);
    }
  }

  // for root domain links, if there's no destination URL, rewrite to placeholder page
  if (!url) {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.rewrite(new URL(`/${domain}`, req.url), {
        headers: {
          ...DUB_HEADERS,
          // we only index root domain links if they're not subdomains
          ...(shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
        },
      }),
      { clickId, path: `/${originalKey}` },
    );
  }

  const isBot = detectBot(req);

  const { country } =
    process.env.VERCEL === "1" && req.geo ? req.geo : LOCALHOST_GEO_DATA;

  // rewrite to proxy page (/proxy/[domain]/[key]) if it's a bot and proxy is enabled
  if (isBot && proxy) {
    return createResponseWithCookie(
      NextResponse.rewrite(
        new URL(`/proxy/${domain}/${encodeURIComponent(key)}`, req.url),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // rewrite to deeplink page if the link is a mailto: or tel:
  } else if (isSupportedDeeplinkProtocol(url)) {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.rewrite(
        new URL(
          `/deeplink/${encodeURIComponent(
            getFinalUrl(url, {
              req,
              clickId: trackConversion ? clickId : undefined,
            }),
          )}`,
          req.url,
        ),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // rewrite to target URL if link cloaking is enabled
  } else if (rewrite) {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.rewrite(
        new URL(
          `/cloaked/${encodeURIComponent(
            getFinalUrl(url, {
              req,
              clickId: trackConversion ? clickId : undefined,
            }),
          )}`,
          req.url,
        ),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && {
              "X-Robots-Tag": "googlebot: noindex",
            }),
          },
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // redirect to iOS link if it is specified and the user is on an iOS device
  } else if (ios && userAgent(req).os?.name === "iOS") {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url: ios,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.redirect(
        getFinalUrl(ios, {
          req,
          clickId: trackConversion ? clickId : undefined,
        }),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
          status: key === "_root" ? 301 : 302,
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // redirect to Android link if it is specified and the user is on an Android device
  } else if (android && userAgent(req).os?.name === "Android") {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url: android,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.redirect(
        getFinalUrl(android, {
          req,
          clickId: trackConversion ? clickId : undefined,
        }),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
          status: key === "_root" ? 301 : 302,
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // redirect to geo-specific link if it is specified and the user is in the specified country
  } else if (geo && country && country in geo) {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url: geo[country],
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    return createResponseWithCookie(
      NextResponse.redirect(
        getFinalUrl(geo[country], {
          req,
          clickId: trackConversion ? clickId : undefined,
        }),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
          status: key === "_root" ? 301 : 302,
        },
      ),
      { clickId, path: `/${originalKey}` },
    );

    // regular redirect
  } else {
    ev.waitUntil(
      recordClick({
        req,
        clickId,
        linkId,
        domain,
        key,
        url,
        webhookIds,
        workspaceId,
        trackConversion,
      }),
    );

    if (hasEmptySearchParams(url)) {
      return NextResponse.rewrite(new URL("/api/patch-redirect", req.url), {
        request: {
          headers: new Headers({
            destination: getFinalUrl(url, {
              req,
              clickId: trackConversion ? clickId : undefined,
            }),
          }),
        },
      });
    }

    return createResponseWithCookie(
      NextResponse.redirect(
        getFinalUrl(url, {
          req,
          clickId: trackConversion ? clickId : undefined,
        }),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
          status: key === "_root" ? 301 : 302,
        },
      ),
      { clickId, path: `/${originalKey}` },
    );
  }
}
