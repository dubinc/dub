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
  isDubDomain,
  isUnsupportedKey,
  nanoid,
  punyEncode,
} from "@dub/utils";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { cookies } from "next/headers";
import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  userAgent,
} from "next/server";
import { trackMixpanelApiService } from "../../core/integration/analytic/services/track-mixpanel-api.service.ts";
import { checkFeaturesAccessAuthLess } from "../actions/check-features-access-auth-less";
import { linkCache } from "../api/links/cache";
import { conn, getLinkViaEdge } from "../planetscale";
import { getDomainViaEdge } from "../planetscale/get-domain-via-edge";
import { hasEmptySearchParams } from "./utils/has-empty-search-params";

const sendScanLimitReachedEvent = async (linkId: string) => {
  console.log("Sending scan limit reached event for link", linkId);

  try {
    const linkRows = await conn.execute(
      `SELECT l.*, u.id as userId, u.email as userEmail,
        (SELECT SUM(clicks) FROM Link WHERE userId = u.id) as totalUserClicks,
        qr.title as qrName
      FROM Link l 
      LEFT JOIN User u ON l.userId = u.id 
      LEFT JOIN Qr qr ON l.id = qr.linkId
      WHERE l.id = ?`,
      [linkId],
    );

    const link = linkRows.rows?.[0];

    console.log("Link", link);

    const featuresAccess = await checkFeaturesAccessAuthLess(link.userId, true);
    console.log("featuresAccess", featuresAccess);
    console.log("link.totalUserClicks", link.totalUserClicks);

    if (link.totalUserClicks >= 29 && !featuresAccess.featuresAccess) {
      // Send Customer.io event
      const auth = Buffer.from(
        `${process.env.CUSTOMER_IO_SITE_ID}:${process.env.CUSTOMER_IO_TRACK_API_KEY}`,
      ).toString("base64");

      const response = await fetch(
        `https://track.customer.io/api/v1/customers/${link.userId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "trial_expired",
            data: {
              codes: 30,
              qr_name: link.qrName,
            },
          }),
        },
      );

      // Send Mixpanel event via fetch
      const mixpanelResponse = await trackMixpanelApiService({
        event: EAnalyticEvents.TRIAL_EXPIRED,
        email: link.userEmail,
        userId: link.userId,
        params: {
          codes: 30,
          timestamp: new Date().toISOString(),
        },
      });

      if (!response.ok) {
        throw new Error(
          `CustomerIo request failed: ${response.status} ${await response.text()}`,
        );
      }

      if (!mixpanelResponse.ok) {
        throw new Error(
          `Mixpanel request failed: ${mixpanelResponse.status} ${await mixpanelResponse.text()}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "Error sending scan limit reached event for link",
      linkId,
      error,
    );
  }
};

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

  let link = await linkCache.get({ domain, key });

  if (link) {
    const linkData = await getLinkViaEdge({ id: link.id });

    const redirectToQrDisabledPlug = NextResponse.redirect(
      new URL(
        `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/qr-disabled`,
        req.url,
      ),
      {
        headers: {
          ...DUB_HEADERS,
          "X-Robots-Tag": "googlebot: noindex",
        },
        status: 302,
      },
    );

    console.log("here1");
    console.log(linkData);

    if (linkData?.archived) {
      return redirectToQrDisabledPlug;
    }

    if (linkData?.userId) {
      const featuresAccess = await checkFeaturesAccessAuthLess(linkData.userId);

      console.log("here2");
      console.log(featuresAccess);

      if (!featuresAccess.featuresAccess) {
        return redirectToQrDisabledPlug;
      }
    }
  }

  if (!link) {
    const linkData = await getLinkViaEdge({ domain, key });

    const redirectToQrDisabledPlug = NextResponse.redirect(
      new URL(
        `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}/qr-disabled`,
        req.url,
      ),
      {
        headers: {
          ...DUB_HEADERS,
          "X-Robots-Tag": "googlebot: noindex",
        },
        status: 302,
      },
    );

    console.log("here3");
    console.log(linkData);

    if (linkData?.archived) {
      return redirectToQrDisabledPlug;
    }

    // Check user restrictions
    if (linkData?.userId) {
      const featuresAccess = await checkFeaturesAccessAuthLess(linkData.userId);

      console.log("here4");
      console.log(featuresAccess);

      if (!featuresAccess.featuresAccess) {
        return redirectToQrDisabledPlug;
      }
    }

    if (!linkData) {
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
        return redirectToQrDisabledPlug;
      }
    }

    // format link to fit the RedisLinkProps interface
    link = formatRedisLink(linkData as any);

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
  let clickId = cookieStore.get("dub_id")?.value;
  if (!clickId) {
    clickId = nanoid(16);
  }

  // for root domain links, if there's no destination URL, rewrite to placeholder page
  if (!url) {
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
    ev.waitUntil(sendScanLimitReachedEvent(linkId));

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
