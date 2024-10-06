import { generateFilters } from "@/lib/ai/generate-filters";
import {
  INTERVAL_DATA,
  INTERVAL_DISPLAYS,
  TRIGGER_DISPLAY,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import useDomains from "@/lib/swr/use-domains";
import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import {
  BlurImage,
  DateRangePicker,
  ExpandingArrow,
  Filter,
  LinkLogo,
  Sliders,
  TooltipContent,
  useRouterStuff,
  useScroll,
} from "@dub/ui";
import {
  Cube,
  CursorRays,
  FlagWavy,
  Globe2,
  Hyperlink,
  LinkBroken,
  Magic,
  MapPosition,
  MobilePhone,
  OfficeBuilding,
  QRCode,
  ReferredVia,
  Tag,
  Window,
} from "@dub/ui/src/icons";
import {
  APP_DOMAIN,
  CONTINENTS,
  COUNTRIES,
  DUB_DEMO_LINKS,
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  capitalize,
  cn,
  fetcher,
  getApexDomain,
  getNextPlan,
  linkConstructor,
  nFormatter,
} from "@dub/utils";
import { readStreamableValue } from "ai/rsc";
import posthog from "posthog-js";
import {
  ComponentProps,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import { COLORS_LIST } from "../links/tag-badge";
import AnalyticsOptions from "./analytics-options";
import { AnalyticsContext } from "./analytics-provider";
import ContinentIcon from "./continent-icon";
import DeviceIcon from "./device-icon";
import EventsOptions from "./events/events-options";
import RefererIcon from "./referer-icon";
import { useAnalyticsFilterOption } from "./utils";

export default function Toggle({
  page = "analytics",
}: {
  page?: "analytics" | "events";
}) {
  const { plan } = useWorkspace();
  const { queryParams, searchParamsObj } = useRouterStuff();
  const {
    basePath,
    domain,
    key,
    url,
    adminPage,
    demoPage,
    start,
    end,
    interval,
  } = useContext(AnalyticsContext);

  const isPublicStatsPage = basePath.startsWith("/stats");

  const scrolled = useScroll(120);

  const { tags } = useTags();
  const { allDomains: domains, primaryDomain } = useDomains();

  const [requestedFilters, setRequestedFilters] = useState<string[]>([]);

  const activeFilters = useMemo(() => {
    const {
      domain,
      key,
      tagId,
      qr,
      continent,
      country,
      city,
      device,
      browser,
      os,
      referer,
      refererUrl,
      url,
      root,
    } = searchParamsObj;
    return [
      ...(domain && !key ? [{ key: "domain", value: domain }] : []),
      ...(domain && key
        ? [
            {
              key: "link",
              value: linkConstructor({ domain, key, pretty: true }),
            },
          ]
        : []),
      ...(tagId ? [{ key: "tagId", value: tagId }] : []),
      ...(qr ? [{ key: "qr", value: qr === "true" }] : []),
      ...(continent ? [{ key: "continent", value: continent }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(city ? [{ key: "city", value: city }] : []),
      ...(device ? [{ key: "device", value: device }] : []),
      ...(browser ? [{ key: "browser", value: browser }] : []),
      ...(os ? [{ key: "os", value: os }] : []),
      ...(referer ? [{ key: "referer", value: referer }] : []),
      ...(refererUrl ? [{ key: "refererUrl", value: refererUrl }] : []),
      ...(url ? [{ key: "url", value: url }] : []),
      ...(root ? [{ key: "root", value: root === "true" }] : []),
    ];
  }, [searchParamsObj]);

  const isRequested = useCallback(
    (key: string) =>
      requestedFilters.includes(key) ||
      activeFilters.some((af) => af.key === key),
    [requestedFilters, activeFilters],
  );

  const links = useAnalyticsFilterOption("top_links", {
    cacheOnly: !isRequested("link"),
  });
  const countries = useAnalyticsFilterOption("countries", {
    cacheOnly: !isRequested("country"),
  });
  const cities = useAnalyticsFilterOption("cities", {
    cacheOnly: !isRequested("city"),
  });
  const continents = useAnalyticsFilterOption("continents", {
    cacheOnly: !isRequested("continent"),
  });
  const devices = useAnalyticsFilterOption("devices", {
    cacheOnly: !isRequested("device"),
  });
  const browsers = useAnalyticsFilterOption("browsers", {
    cacheOnly: !isRequested("browser"),
  });
  const os = useAnalyticsFilterOption("os", {
    cacheOnly: !isRequested("os"),
  });
  const triggers = useAnalyticsFilterOption("triggers", {
    cacheOnly: !isRequested("trigger"),
  });
  const referers = useAnalyticsFilterOption("referers", {
    cacheOnly: !isRequested("referer"),
  });
  const refererUrls = useAnalyticsFilterOption("referer_urls", {
    cacheOnly: !isRequested("refererUrl"),
  });
  const urls = useAnalyticsFilterOption("top_urls", {
    cacheOnly: !isRequested("url"),
  });

  // Some suggestions will only appear if previously requested (see isRequested above)
  const aiFilterSuggestions = useMemo(
    () => [
      ...(isPublicStatsPage
        ? []
        : [
            {
              value: `Clicks on ${primaryDomain} domain this year`,
              icon: Globe2,
            },
          ]),
      {
        value: "Mobile users, US only",
        icon: MobilePhone,
      },
      {
        value: "Tokyo, Chrome users",
        icon: OfficeBuilding,
      },
      {
        value: "Safari, Singapore, last month",
        icon: FlagWavy,
      },
      {
        value: "QR scans last quarter",
        icon: QRCode,
      },
    ],
    [primaryDomain, isPublicStatsPage],
  );

  const [streaming, setStreaming] = useState<boolean>(false);

  const filters: ComponentProps<typeof Filter.Select>["filters"] = useMemo(
    () => [
      {
        key: "ai",
        icon: Magic,
        label: "Ask AI",
        separatorAfter: true,
        options:
          aiFilterSuggestions?.map(({ icon, value }) => ({
            value,
            label: value,
            icon,
          })) ?? null,
      },
      ...(isPublicStatsPage
        ? []
        : [
            {
              key: "domain",
              icon: Globe2,
              label: "Domain",
              getOptionIcon: (value) => (
                <BlurImage
                  src={`${GOOGLE_FAVICON_URL}${value}`}
                  alt={value}
                  className="h-4 w-4 rounded-full"
                  width={16}
                  height={16}
                />
              ),
              options: domains.map((domain) => ({
                value: domain.slug,
                label: domain.slug,
              })),
            },
            {
              key: "link",
              icon: Hyperlink,
              label: "Link",
              getOptionIcon: (value, props) => {
                const url = props.option?.data?.url;
                const [domain, key] = value.split("/");

                return <LinkIcon url={url} domain={domain} linkKey={key} />;
              },
              options:
                links?.map(
                  ({
                    domain,
                    key,
                    url,
                    count,
                  }: LinkProps & { count?: number }) => ({
                    value: linkConstructor({ domain, key, pretty: true }),
                    label: linkConstructor({ domain, key, pretty: true }),
                    right: nFormatter(count, { full: true }),
                    data: { url },
                  }),
                ) ?? null,
            },
            {
              key: "root",
              icon: Sliders,
              label: "Link type",
              options: [
                {
                  value: true,
                  icon: Globe2,
                  label: "Root domain link",
                },
                {
                  value: false,
                  icon: Hyperlink,
                  label: "Regular short link",
                },
              ],
            },
            {
              key: "tagId",
              icon: Tag,
              label: "Tag",
              getOptionIcon: (value, props) => {
                const tagColor =
                  props.option?.data?.color ??
                  tags?.find(({ id }) => id === value)?.color;
                return tagColor ? (
                  <div
                    className={cn(
                      "rounded-md p-1.5",
                      COLORS_LIST.find(({ color }) => color === tagColor)?.css,
                    )}
                  >
                    <Tag className="h-2.5 w-2.5" />
                  </div>
                ) : null;
              },
              options:
                tags?.map((tag) => ({
                  value: tag.id,
                  icon: (
                    <div
                      className={cn(
                        "rounded-md p-1.5",
                        COLORS_LIST.find(({ color }) => color === tag.color)
                          ?.css,
                      )}
                    >
                      <Tag className="h-2.5 w-2.5" />
                    </div>
                  ),
                  label: tag.name,
                  data: { color: tag.color },
                })) ?? null,
            },
          ]),
      {
        key: "qr",
        icon: CursorRays,
        label: "Trigger",
        options:
          triggers?.map(({ trigger, count }) => ({
            value: trigger,
            label: TRIGGER_DISPLAY[trigger],
            icon: trigger === "qr" ? QRCode : CursorRays,
            right: nFormatter(count, { full: true }),
          })) ?? null,
        separatorAfter: !isPublicStatsPage,
      },
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
          />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options:
          countries?.map(({ country, count }) => ({
            value: country,
            label: COUNTRIES[country],
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "city",
        icon: OfficeBuilding,
        label: "City",
        options:
          cities?.map(({ city, country, count }) => ({
            value: city,
            label: city,
            icon: (
              <img
                alt={country}
                src={`https://flag.vercel.app/m/${country}.svg`}
                className="h-2.5 w-4"
              />
            ),
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "continent",
        icon: MapPosition,
        label: "Continent",
        getOptionIcon: (value) => (
          <ContinentIcon display={value} className="size-2.5" />
        ),
        getOptionLabel: (value) => CONTINENTS[value],
        options:
          continents?.map(({ continent, count }) => ({
            value: continent,
            label: CONTINENTS[continent],
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "device",
        icon: MobilePhone,
        label: "Device",
        getOptionIcon: (value) => (
          <DeviceIcon
            display={capitalize(value) ?? value}
            tab="devices"
            className="h-4 w-4"
          />
        ),
        options:
          devices?.map(({ device, count }) => ({
            value: device,
            label: device,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "browser",
        icon: Window,
        label: "Browser",
        getOptionIcon: (value) => (
          <DeviceIcon display={value} tab="browsers" className="h-4 w-4" />
        ),
        options:
          browsers?.map(({ browser, count }) => ({
            value: browser,
            label: browser,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "os",
        icon: Cube,
        label: "OS",
        getOptionIcon: (value) => (
          <DeviceIcon display={value} tab="os" className="h-4 w-4" />
        ),
        options:
          os?.map(({ os, count }) => ({
            value: os,
            label: os,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "referer",
        icon: ReferredVia,
        label: "Referer",
        getOptionIcon: (value, props) => (
          <RefererIcon display={value} className="h-4 w-4" />
        ),
        options:
          referers?.map(({ referer, count }) => ({
            value: referer,
            label: referer,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      {
        key: "refererUrl",
        icon: ReferredVia,
        label: "Referer URL",
        getOptionIcon: (value, props) => (
          <RefererIcon display={value} className="h-4 w-4" />
        ),
        options:
          refererUrls?.map(({ refererUrl, count }) => ({
            value: refererUrl,
            label: refererUrl,
            right: nFormatter(count, { full: true }),
          })) ?? null,
      },
      ...(key && domain
        ? [
            {
              key: "url",
              icon: LinkBroken,
              label: "Destination URL",
              getOptionIcon: (_, props) => (
                <LinkLogo
                  apexDomain={getApexDomain(props.option?.data?.url)}
                  className="size-4 sm:size-4"
                />
              ),
              options:
                urls?.map(({ url, count }) => ({
                  value: url,
                  label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                  right: nFormatter(count, { full: true }),
                })) ?? null,
            },
          ]
        : []),
    ],
    [
      isPublicStatsPage,
      domains,
      links,
      tags,
      countries,
      cities,
      devices,
      browsers,
      os,
      referers,
      refererUrls,
      urls,
    ],
  );

  return (
    <>
      <div
        className={cn("sticky top-11 z-10 bg-gray-50 py-3 md:py-3", {
          "top-14": isPublicStatsPage,
          "top-16": adminPage || demoPage,
          "shadow-md": scrolled,
        })}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-screen-xl flex-col gap-2 px-2.5 lg:px-20",
            {
              "md:h-10": key,
            },
          )}
        >
          <div
            className={cn(
              "flex w-full flex-col items-center justify-between gap-2 md:flex-row",
              {
                "flex-col md:flex-row": !key,
                "items-center": key,
              },
            )}
          >
            {isPublicStatsPage ? (
              <a
                className="group flex items-center text-lg font-semibold text-gray-800"
                href={linkConstructor({ domain, key })}
                target="_blank"
                rel="noreferrer"
              >
                <BlurImage
                  alt={url || "Dub.co"}
                  src={
                    url
                      ? `${GOOGLE_FAVICON_URL}${getApexDomain(url)}`
                      : DUB_LOGO
                  }
                  className="mr-2 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                  width={48}
                  height={48}
                />
                <p className="max-w-[192px] truncate sm:max-w-[400px]">
                  {linkConstructor({
                    domain,
                    key,
                    pretty: true,
                  })}
                </p>
                <ExpandingArrow className="h-5 w-5" />
              </a>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                {page === "analytics" ? "Analytics" : "Events"}
              </h1>
            )}
            <div
              className={cn("flex items-center gap-2", {
                "w-full flex-col min-[550px]:flex-row md:w-auto": !key,
                "w-full md:w-auto": key,
              })}
            >
              <Filter.Select
                className="w-full"
                filters={filters}
                activeFilters={activeFilters}
                onSelect={async (key, value) => {
                  if (key === "ai") {
                    setStreaming(true);
                    const prompt = value.replace("Ask AI ", "");
                    const { object } = await generateFilters(prompt);
                    for await (const partialObject of readStreamableValue(
                      object,
                    )) {
                      if (partialObject) {
                        queryParams({
                          set: {
                            ...partialObject,
                          },
                        });
                      }
                    }
                    posthog.capture("ai_filters_generated", {
                      prompt,
                      filters: activeFilters,
                    });
                    setStreaming(false);
                  } else {
                    queryParams({
                      set:
                        key === "link"
                          ? {
                              domain: new URL(`https://${value}`).hostname,
                              key:
                                new URL(`https://${value}`).pathname.slice(1) ||
                                "_root",
                            }
                          : {
                              [key]: value,
                            },
                      del: "page",
                    });
                  }
                }}
                onRemove={(key) =>
                  queryParams({
                    del: key === "link" ? ["domain", "key"] : key,
                  })
                }
                onOpenFilter={(key) =>
                  setRequestedFilters((rf) =>
                    rf.includes(key) ? rf : [...rf, key],
                  )
                }
                askAI
              />
              <div
                className={cn("flex w-full items-center gap-2", {
                  "min-[550px]:w-auto": !key,
                  "justify-end": key,
                })}
              >
                <DateRangePicker
                  className="w-full sm:min-w-[200px]"
                  align="end"
                  value={
                    start && end
                      ? {
                          from: start,
                          to: end,
                        }
                      : undefined
                  }
                  presetId={!start || !end ? interval ?? "24h" : undefined}
                  onChange={(range, preset) => {
                    if (preset) {
                      queryParams({
                        del: ["start", "end"],
                        set: {
                          interval: preset.id,
                        },
                      });

                      return;
                    }

                    // Regular range
                    if (!range || !range.from || !range.to) return;

                    queryParams({
                      del: "preset",
                      set: {
                        start: range.from.toISOString(),
                        end: range.to.toISOString(),
                      },
                    });
                  }}
                  presets={INTERVAL_DISPLAYS.map(
                    ({ display, value, shortcut }) => {
                      const start = INTERVAL_DATA[value].startDate;
                      const end = new Date();

                      const requiresUpgrade =
                        adminPage ||
                        demoPage ||
                        DUB_DEMO_LINKS.find(
                          (l) => l.domain === domain && l.key === key,
                        )
                          ? false
                          : !validDateRangeForPlan({
                              plan,
                              start,
                              end,
                            });

                      return {
                        id: value,
                        label: display,
                        dateRange: {
                          from: start,
                          to: end,
                        },
                        requiresUpgrade,
                        tooltipContent: requiresUpgrade ? (
                          <UpgradeTooltip rangeLabel={display} plan={plan} />
                        ) : undefined,
                        shortcut,
                      };
                    },
                  )}
                />
                {!isPublicStatsPage && page === "analytics" && (
                  <AnalyticsOptions />
                )}
                {page === "events" && <EventsOptions />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-2.5 lg:px-20">
        <Filter.List
          filters={filters}
          activeFilters={[
            ...activeFilters,
            ...(streaming && !activeFilters.length
              ? Array.from({ length: 2 }, (_, i) => i).map((i) => ({
                  key: "loader",
                  value: i,
                }))
              : []),
          ]}
          onRemove={(key) =>
            queryParams({
              del: key === "link" ? ["domain", "key", "url"] : key,
            })
          }
          onRemoveAll={() =>
            queryParams({
              // Reset all filters except for date range
              del: VALID_ANALYTICS_FILTERS.concat(["page"]).filter(
                (f) => !["interval", "start", "end"].includes(f),
              ),
            })
          }
        />
        <div
          className={cn(
            "transition-[height] duration-[300ms]",
            streaming || activeFilters.length ? "h-6" : "h-0",
          )}
        />
      </div>
    </>
  );
}

function UpgradeTooltip({
  rangeLabel,
  plan,
}: {
  rangeLabel: string;
  plan?: string;
}) {
  const { slug } = useWorkspace();

  const isAllTime = rangeLabel === "All Time";

  return (
    <TooltipContent
      title={`${rangeLabel} can only be viewed on a ${isAllTime ? "Business" : getNextPlan(plan).name} plan or higher. Upgrade now to view more stats.`}
      cta={`Upgrade to ${isAllTime ? "Business" : getNextPlan(plan).name}`}
      href={slug ? `/${slug}/upgrade` : APP_DOMAIN}
    />
  );
}

function LinkIcon({
  url: urlProp,
  domain,
  linkKey,
}: {
  url?: string;
  domain?: string;
  linkKey?: string;
}) {
  const { id: workspaceId } = useWorkspace();
  const { data } = useSWR<{ url: string }>(
    !urlProp && workspaceId && domain && linkKey
      ? `/api/links/info?${new URLSearchParams({ workspaceId, domain, key: linkKey }).toString()}`
      : null,
    fetcher,
  );

  const url = urlProp || data?.url;
  return url ? (
    <LinkLogo
      apexDomain={getApexDomain(url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ) : (
    <Hyperlink className="h-4 w-4" />
  );
}
