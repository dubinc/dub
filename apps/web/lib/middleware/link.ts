import {
  createResponseWithCookie,
  detectBot,
  getFinalUrl,
  isSupportedDeeplinkProtocol,
  parse,
} from "@/lib/middleware/utils";
import { recordClick } from "@/lib/tinybird";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  DUB_HEADERS,
  LEGAL_WORKSPACE_ID,
  LOCALHOST_GEO_DATA,
  isDubDomain,
  isUnsupportedKey,
  nanoid,
  punyEncode,
} from "@dub/utils";
import { cookies } from "next/headers";
import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  userAgent,
} from "next/server";
import { getLinkViaEdge } from "../planetscale";
import { getDomainViaEdge } from "../planetscale/get-domain-via-edge";
import { RedisLinkProps } from "../types";

export default async function LinkMiddleware(
  req: NextRequest,
  ev: NextFetchEvent,
) {
  let { domain, fullKey: originalKey } = parse(req);

  if (!domain) {
    return NextResponse.next();
  }

  // encode the key to ascii
  // links on Dub are case insensitive by default
  let key = punyEncode(originalKey.toLowerCase());

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

  let link = await redis.hget<RedisLinkProps>(domain, key);

  if (!link) {
    const linkData = await getLinkViaEdge(domain, key);

    if (!linkData) {
      // check if domain has notFoundUrl configured
      const domainData = await getDomainViaEdge(domain);
      if (domainData?.notFoundUrl) {
        return NextResponse.redirect(domainData.notFoundUrl, {
          headers: {
            ...DUB_HEADERS,
            "X-Robots-Tag": "googlebot: noindex",
          },
          status: 302,
        });
      } else {
        return NextResponse.rewrite(new URL("/notfoundlink", req.url), {
          headers: DUB_HEADERS,
        });
      }
    }

    // format link to fit the RedisLinkProps interface
    link = await formatRedisLink(linkData as any);

    ev.waitUntil(
      redis.hset(domain, {
        [key]: link,
      }),
    );
  }

  const {
    id: linkId,
    url,
    password,
    trackConversion,
    proxy,
    rewrite,
    iframeable,
    expiresAt,
    ios,
    android,
    geo,
    expiredUrl,
    doIndex,
    webhookIds,
    projectId: workspaceId,
  } = link;

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
    const pw = req.nextUrl.searchParams.get("pw");

    // rewrite to auth page (/password/[domain]/[key]) if:
    // - no `pw` param is provided
    // - the `pw` param is incorrect
    // this will also ensure that no clicks are tracked unless the password is correct
    if (!pw || (await getLinkViaEdge(domain, key))?.password !== pw) {
      return NextResponse.rewrite(
        new URL(`/password/${domain}/${encodeURIComponent(key)}`, req.url),
        {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && {
              "X-Robots-Tag": "googlebot: noindex",
            }),
          },
        },
      );
    } else if (pw) {
      // strip it from the URL if it's correct
      req.nextUrl.searchParams.delete("pw");
    }
  }

  // if the link is banned
  if (link.projectId === LEGAL_WORKSPACE_ID) {
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
  let clickId =
    cookieStore.get("dub_id")?.value || cookieStore.get("dclid")?.value;
  if (!clickId) {
    clickId = nanoid(16);
  }

  // for root domain links, if there's no destination URL, rewrite to placeholder page
  if (!url) {
    ev.waitUntil(
      recordClick({
        req,
        linkId,
        clickId,
        url,
        webhookIds,
        workspaceId,
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
        linkId,
        clickId,
        url,
        webhookIds,
        workspaceId,
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
        linkId,
        clickId,
        url,
        webhookIds,
        workspaceId,
      }),
    );

    if (iframeable) {
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
    } else {
      // if link is not iframeable, use Next.js rewrite instead
      return createResponseWithCookie(
        NextResponse.rewrite(url, {
          headers: {
            ...DUB_HEADERS,
            ...(!shouldIndex && { "X-Robots-Tag": "googlebot: noindex" }),
          },
        }),
        { clickId, path: `/${originalKey}` },
      );
    }

    // redirect to iOS link if it is specified and the user is on an iOS device
  } else if (ios && userAgent(req).os?.name === "iOS") {
    ev.waitUntil(
      recordClick({
        req,
        linkId,
        clickId,
        url: ios,
        webhookIds,
        workspaceId,
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
        linkId,
        clickId,
        url: android,
        webhookIds,
        workspaceId,
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
        linkId,
        clickId,
        url: geo[country],
        webhookIds,
        workspaceId,
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
        linkId,
        clickId,
        url,
        webhookIds,
        workspaceId,
      }),
    );

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
