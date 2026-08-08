import {
  decodeLinkIfCaseSensitive,
  encodeKeyIfCaseSensitive,
} from "@/lib/api/links/case-sensitivity";
import type { InAppBrowserSource } from "@/lib/middleware/utils/detect-in-app-browser";
import { isGooglePlayStoreUrl } from "@/lib/middleware/utils/is-google-play-store-url";
import { isIosAppStoreUrl } from "@/lib/middleware/utils/is-ios-app-store-url";
import { prisma } from "@/lib/prisma";
import { parseDeepViewData } from "@/lib/zod/schemas/deep-links";
import { Grid, Wordmark } from "@dub/ui";
import {
  AndroidLogo,
  ArrowRight,
  Copy,
  IOSAppStore,
  MobilePhone,
} from "@dub/ui/icons";
import { cn, constructMetadata } from "@dub/utils";
import { headers } from "next/headers";
import Link from "next/link";
import { userAgent } from "next/server";
import { BrandLogoBadge } from "../../app.dub.co/(deeplink)/deeplink/[domain]/[[...key]]/brand-logo-badge";
import { InAppBrowserActionButton } from "./action-button";
import { getLanguage, getTranslations } from "./translations";

export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export const metadata = constructMetadata({
  title: "Open link",
  noIndex: true,
});

const VALID_SOURCES = new Set<InAppBrowserSource>([
  "instagram",
  "facebook",
  "tiktok",
]);

function getDestinationUrl(param: string): string {
  if (/^https?%3A/i.test(param)) {
    try {
      return decodeURIComponent(param);
    } catch {
      return param;
    }
  }

  return param;
}

const COPY_URL_EXCLUDED_PARAMS = new Set(["source", "domain", "key"]);

function getCopyUrl({
  shortLink,
  destinationUrl,
  searchParams,
}: {
  shortLink: string | undefined;
  destinationUrl: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!shortLink) {
    return destinationUrl;
  }

  try {
    const copyUrl = new URL(shortLink);

    for (const [param, value] of Object.entries(searchParams)) {
      if (COPY_URL_EXCLUDED_PARAMS.has(param) || value == null) {
        continue;
      }
      const paramValue = Array.isArray(value) ? value[0] : value;
      if (paramValue == null) {
        continue;
      }
      copyUrl.searchParams.set(param, paramValue);
    }

    copyUrl.searchParams.set("skip_deeplink_preview", "1");
    return copyUrl.toString();
  } catch {
    return destinationUrl;
  }
}

function getExtBrowserScheme(
  source: InAppBrowserSource | null,
  destinationUrl: string,
  platform: "ios" | "android",
): string | null {
  if (!source) {
    return null;
  }

  const isStoreUrl =
    isIosAppStoreUrl(destinationUrl) || isGooglePlayStoreUrl(destinationUrl);
  if (!isStoreUrl) {
    return null;
  }

  if (source === "tiktok") {
    return null;
  }

  try {
    const parsed = new URL(destinationUrl);

    if (platform === "android") {
      return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;end`;
    }

    if (source === "instagram") {
      return `instagram://extbrowser/?url=${encodeURIComponent(destinationUrl)}`;
    }

    if (source === "facebook") {
      return `x-safari-https://${parsed.host}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

export default async function InAppBrowserEscapePage(props: {
  params: Promise<{ url: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const destinationUrl = getDestinationUrl(params.url);
  const rawSource = Array.isArray(searchParams.source)
    ? searchParams.source[0]
    : searchParams.source;
  const source: InAppBrowserSource | null = VALID_SOURCES.has(
    rawSource as InAppBrowserSource,
  )
    ? (rawSource as InAppBrowserSource)
    : null;

  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const language = getLanguage(acceptLanguage);
  const t = getTranslations(language);

  const ua = userAgent({ headers: headersList });
  const platform: "ios" | "android" =
    ua.os?.name === "Android" ? "android" : "ios";

  const domain = Array.isArray(searchParams.domain)
    ? searchParams.domain[0]
    : searchParams.domain;
  const key = Array.isArray(searchParams.key)
    ? searchParams.key[0]
    : searchParams.key;

  let link: {
    domain: string;
    key: string;
    shortLink: string;
    url: string;
    shortDomain: { deepviewData: unknown } | null;
  } | null = null;

  if (domain && key) {
    const encodedKey = encodeKeyIfCaseSensitive({ domain, key });
    const found = await prisma.link.findUnique({
      where: {
        domain_key: {
          domain,
          key: encodedKey,
        },
      },
      select: {
        domain: true,
        key: true,
        shortLink: true,
        url: true,
        shortDomain: {
          select: {
            deepviewData: true,
          },
        },
      },
    });

    if (found) {
      link = decodeLinkIfCaseSensitive(found) ?? found;
    }
  }

  const deepViewData = parseDeepViewData(link?.shortDomain?.deepviewData);
  const { hidePoweredByBadge = false, variant, buttonStyle } = deepViewData;

  const isPlayStore = isGooglePlayStoreUrl(destinationUrl);
  const storeName = isPlayStore ? "Google Play" : "App Store";
  const extBrowserScheme = getExtBrowserScheme(
    source,
    destinationUrl,
    platform,
  );
  const description = (
    extBrowserScheme ? t.description : t.manualEscapeDescription
  ).replace("{storeName}", storeName);
  const ctaLabel = t.openInStore.replace("{storeName}", storeName);

  const badgeLink = {
    shortLink: link?.shortLink ?? destinationUrl,
    url: destinationUrl,
  };
  const copyUrl = getCopyUrl({
    shortLink: link?.shortLink,
    destinationUrl,
    searchParams,
  });

  return (
    <>
      {extBrowserScheme ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.href=${JSON.stringify(extBrowserScheme)};`,
          }}
        />
      ) : null}
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col bg-white">
        {variant !== "minimal" && (
          <div className="absolute inset-0 isolate overflow-hidden bg-white">
            <div
              className={cn(
                "absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2",
                "[mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
              )}
            >
              <Grid
                cellSize={60}
                patternOffset={[0.75, 0]}
                className="text-neutral-200"
              />
            </div>

            {[...Array(2)].map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6]",
                  idx === 0 ? "mix-blend-overlay" : "opacity-10",
                )}
              >
                {[...Array(idx === 0 ? 2 : 1)].map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                      "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="relative z-10 flex flex-1 flex-col px-8 py-8">
          {!hidePoweredByBadge && (
            <div className="flex justify-center">
              <Link
                href="https://dub.co/docs/concepts/deep-links/quickstart"
                target="_blank"
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap text-sm font-medium text-neutral-900",
                  t["poweredByOrder"] === "inverted" ? "flex-row-reverse" : "",
                )}
              >
                {t.poweredBy}{" "}
                <Wordmark className="text-content-emphasis h-3.5" />
              </Link>
            </div>
          )}

          <div className="flex flex-1 flex-col justify-center gap-8">
            <div className="flex flex-col items-center gap-y-3">
              <BrandLogoBadge link={badgeLink} appName={storeName} />

              {variant === "minimal" ? (
                <p className="text-pretty text-center font-light text-neutral-500">
                  {description}
                </p>
              ) : (
                <div className="flex h-40 w-full max-w-xs flex-col gap-6 rounded-xl border border-neutral-300 px-10 py-8">
                  <p className="text-pretty text-center text-sm text-neutral-600">
                    {description}
                  </p>

                  <div className="flex items-center justify-center gap-3">
                    <Copy className="text-content-default size-6" />
                    <ArrowRight className="text-content-subtle size-3" />
                    {isPlayStore || platform === "android" ? (
                      <AndroidLogo className="text-content-default size-6" />
                    ) : (
                      <IOSAppStore className="text-content-default size-6" />
                    )}
                    <ArrowRight className="text-content-subtle size-3" />
                    <MobilePhone className="text-content-default size-6" />
                  </div>
                </div>
              )}
            </div>

            <InAppBrowserActionButton
              label={ctaLabel}
              copyLabel={t.copyLink}
              copiedLabel={t.copied}
              copyFailedLabel={t.copyFailed}
              copyUrl={copyUrl}
              intentFallbackUrl={destinationUrl}
              extBrowserScheme={extBrowserScheme}
              buttonStyle={buttonStyle}
            />
          </div>
        </div>
      </main>
    </>
  );
}
