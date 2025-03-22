import { generateFilters } from "@/lib/ai/generate-filters";
import {
  DUB_LINKS_ANALYTICS_INTERVAL,
  INTERVAL_DISPLAYS,
  TRIGGER_DISPLAY,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import useDomains from "@/lib/swr/use-domains";
import useDomainsCount from "@/lib/swr/use-domains-count";
import useFolder from "@/lib/swr/use-folder";
import useFolders from "@/lib/swr/use-folders";
import useFoldersCount from "@/lib/swr/use-folders-count";
import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { DOMAINS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/domains";
import { FOLDERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/folders";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import {
  BlurImage,
  Button,
  ChartLine,
  DateRangePicker,
  ExpandingArrow,
  Filter,
  LinkLogo,
  Sliders,
  SquareLayoutGrid6,
  TooltipContent,
  useMediaQuery,
  useRouterStuff,
  useScroll,
  UTM_PARAMETERS,
} from "@dub/ui";
import {
  Cube,
  CursorRays,
  FlagWavy,
  Folder,
  Globe2,
  Hyperlink,
  LinkBroken,
  LocationPin,
  Magic,
  MapPosition,
  MobilePhone,
  OfficeBuilding,
  QRCode,
  ReferredVia,
  Tag,
  Window,
} from "@dub/ui/icons";
import {
  APP_DOMAIN,
  capitalize,
  cn,
  CONTINENTS,
  COUNTRIES,
  DUB_DEMO_LINKS,
  DUB_LOGO,
  getApexDomain,
  getNextPlan,
  GOOGLE_FAVICON_URL,
  linkConstructor,
  nFormatter,
  REGIONS,
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
import { useDebounce } from "use-debounce";
import { FolderIcon } from "../folders/folder-icon";
import { LinkIcon } from "../links/link-icon";
import TagBadge from "../links/tag-badge";
import AnalyticsOptions from "./analytics-options";
import { AnalyticsContext } from "./analytics-provider";
import ContinentIcon from "./continent-icon";
import DeviceIcon from "./device-icon";
import EventsOptions from "./events/events-options";
import RefererIcon from "./referer-icon";
import { ShareButton } from "./share-button";
import { useAnalyticsFilterOption } from "./utils";

export default function Toggle({
  page = "analytics",
}: {
  page?: "analytics" | "events";
}) {
  const { slug, plan, flags, createdAt } = useWorkspace();

  const { router, queryParams, searchParamsObj, getQueryString } =
    useRouterStuff();

  const {
    domain,
    key,
    url,
    adminPage,
    demoPage,
    partnerPage,
    dashboardProps,
    start,
    end,
    interval,
  } = useContext(AnalyticsContext);

  const scrolled = useScroll(120);

  // Determine whether tags and domains should be fetched async
  const { data: tagsCount } = useTagsCount();
  const { data: domainsCount } = useDomainsCount({ ignoreParams: true });
  const { data: foldersCount } = useFoldersCount();
  const tagsAsync = Boolean(tagsCount && tagsCount > TAGS_MAX_PAGE_SIZE);
  const domainsAsync = domainsCount && domainsCount > DOMAINS_MAX_PAGE_SIZE;
  const foldersAsync = foldersCount && foldersCount > FOLDERS_MAX_PAGE_SIZE;

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { tags, loading: loadingTags } = useTags({
    query: {
      search: tagsAsync && selectedFilter === "tagIds" ? debouncedSearch : "",
    },
  });
  const { folders, loading: loadingFolders } = useFolders({
    query: {
      search:
        foldersAsync && selectedFilter === "folderId" ? debouncedSearch : "",
    },
  });

  const {
    allDomains: domains,
    primaryDomain,
    loading: loadingDomains,
  } = useDomains({
    ignoreParams: true,
    opts: {
      search:
        domainsAsync && selectedFilter === "domain" ? debouncedSearch : "",
    },
  });

  const selectedTagIds = useMemo(
    () => searchParamsObj.tagIds?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj.tagIds],
  );

  const { tags: selectedTags } = useTags({
    query: { ids: selectedTagIds },
    enabled: tagsAsync,
  });

  const selectedFolderId = searchParamsObj.folderId;

  const { folder: selectedFolder } = useFolder({
    folderId: selectedFolderId,
  });

  const [requestedFilters, setRequestedFilters] = useState<string[]>([]);

  const activeFilters = useMemo(() => {
    const { domain, key, root, folderId, ...params } = searchParamsObj;

    // Handle special cases first
    const filters = [
      // Handle domain/key special case
      ...(domain && !key ? [{ key: "domain", value: domain }] : []),
      ...(domain && key
        ? [
            {
              key: "link",
              value: linkConstructor({ domain, key, pretty: true }),
            },
          ]
        : []),
      // Handle tagIds special case
      ...(selectedTagIds.length > 0
        ? [{ key: "tagIds", value: selectedTagIds }]
        : []),
      // Handle root special case - convert string to boolean
      ...(root ? [{ key: "root", value: root === "true" }] : []),
      // Handle folderId special case
      ...(folderId ? [{ key: "folderId", value: folderId }] : []),
    ];

    // Handle all other filters dynamically
    VALID_ANALYTICS_FILTERS.forEach((filter) => {
      // Skip special cases we handled above
      if (["domain", "key", "tagId", "tagIds", "root"].includes(filter)) return;
      // also skip date range filters and qr
      if (["interval", "start", "end", "qr"].includes(filter)) return;

      const value = params[filter];
      if (value) {
        filters.push({ key: filter, value });
      }
    });

    return filters;
  }, [searchParamsObj, selectedTagIds]);

  const isRequested = useCallback(
    (key: string) =>
      requestedFilters.includes(key) ||
      activeFilters.some((af) => af.key === key),
    [requestedFilters, activeFilters],
  );

  const { data: links } = useAnalyticsFilterOption("top_links", {
    cacheOnly: !isRequested("link"),
  });
  const { data: countries } = useAnalyticsFilterOption("countries", {
    cacheOnly: !isRequested("country"),
  });
  const { data: regions } = useAnalyticsFilterOption("regions", {
    cacheOnly: !isRequested("region"),
  });
  const { data: cities } = useAnalyticsFilterOption("cities", {
    cacheOnly: !isRequested("city"),
  });
  const { data: continents } = useAnalyticsFilterOption("continents", {
    cacheOnly: !isRequested("continent"),
  });
  const { data: devices } = useAnalyticsFilterOption("devices", {
    cacheOnly: !isRequested("device"),
  });
  const { data: browsers } = useAnalyticsFilterOption("browsers", {
    cacheOnly: !isRequested("browser"),
  });
  const { data: os } = useAnalyticsFilterOption("os", {
    cacheOnly: !isRequested("os"),
  });
  const { data: triggers } = useAnalyticsFilterOption("triggers", {
    cacheOnly: !isRequested("trigger"),
  });
  const { data: referers } = useAnalyticsFilterOption("referers", {
    cacheOnly: !isRequested("referer"),
  });
  const { data: refererUrls } = useAnalyticsFilterOption("referer_urls", {
    cacheOnly: !isRequested("refererUrl"),
  });
  const { data: urls } = useAnalyticsFilterOption("top_urls", {
    cacheOnly: !isRequested("url"),
  });
  const { data: utmSources } = useAnalyticsFilterOption("utm_sources", {
    cacheOnly: !isRequested("utm_source"),
  });
  const { data: utmMediums } = useAnalyticsFilterOption("utm_mediums", {
    cacheOnly: !isRequested("utm_medium"),
  });
  const { data: utmCampaigns } = useAnalyticsFilterOption("utm_campaigns", {
    cacheOnly: !isRequested("utm_campaign"),
  });
  const { data: utmTerms } = useAnalyticsFilterOption("utm_terms", {
    cacheOnly: !isRequested("utm_term"),
  });
  const { data: utmContents } = useAnalyticsFilterOption("utm_contents", {
    cacheOnly: !isRequested("utm_content"),
  });
  const utmData = {
    utm_source: utmSources,
    utm_medium: utmMediums,
    utm_campaign: utmCampaigns,
    utm_term: utmTerms,
    utm_content: utmContents,
  };

  // Some suggestions will only appear if previously requested (see isRequested above)
  const aiFilterSuggestions = useMemo(
    () => [
      ...(dashboardProps || partnerPage
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
    [primaryDomain, dashboardProps, partnerPage],
  );

  const [streaming, setStreaming] = useState<boolean>(false);

  const LinkFilterItem = {
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
        ({ domain, key, url, count }: LinkProps & { count?: number }) => ({
          value: linkConstructor({ domain, key, pretty: true }),
          label: linkConstructor({ domain, key, pretty: true }),
          right: nFormatter(count, { full: true }),
          data: { url },
        }),
      ) ?? null,
  };

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
      ...(dashboardProps
        ? []
        : partnerPage
          ? [LinkFilterItem]
          : [
              ...(flags?.linkFolders
                ? [
                    {
                      key: "folderId",
                      icon: Folder,
                      label: "Folder",
                      shouldFilter: !foldersAsync,
                      getOptionIcon: (value, props) => {
                        const folderName = props.option?.label;
                        const folder = folders?.find(
                          ({ name }) => name === folderName,
                        );

                        return folder ? (
                          <FolderIcon
                            folder={folder}
                            shape="square"
                            iconClassName="size-3"
                          />
                        ) : null;
                      },
                      options: loadingFolders
                        ? null
                        : [
                            ...(folders || []),
                            // Add currently filtered folder if not already in the list
                            ...(selectedFolder &&
                            !folders?.find((f) => f.id === selectedFolder.id)
                              ? [selectedFolder]
                              : []),
                          ].map((folder) => ({
                            value: folder.id,
                            icon: (
                              <FolderIcon
                                folder={folder}
                                shape="square"
                                iconClassName="size-3"
                              />
                            ),
                            label: folder.name,
                          })),
                    },
                  ]
                : []),
              {
                key: "tagIds",
                icon: Tag,
                label: "Tag",
                multiple: true,
                shouldFilter: !tagsAsync,
                getOptionIcon: (value, props) => {
                  const tagColor =
                    props.option?.data?.color ??
                    tags?.find(({ id }) => id === value)?.color;
                  return tagColor ? (
                    <TagBadge color={tagColor} withIcon className="sm:p-1" />
                  ) : null;
                },
                options: loadingTags
                  ? null
                  : [
                      ...(tags || []),
                      // Add currently filtered tags if not already in the list
                      ...(selectedTags || []).filter(
                        ({ id }) => !tags?.some((t) => t.id === id),
                      ),
                    ].map(({ id, name, color }) => ({
                      value: id,
                      icon: (
                        <TagBadge color={color} withIcon className="sm:p-1" />
                      ),
                      label: name,
                      data: { color },
                    })),
              },
              {
                key: "domain",
                icon: Globe2,
                label: "Domain",
                shouldFilter: !domainsAsync,
                getOptionIcon: (value) => (
                  <BlurImage
                    src={`${GOOGLE_FAVICON_URL}${value}`}
                    alt={value}
                    className="h-4 w-4 rounded-full"
                    width={16}
                    height={16}
                  />
                ),
                options: loadingDomains
                  ? null
                  : [
                      ...domains.map((domain) => ({
                        value: domain.slug,
                        label: domain.slug,
                      })),
                      // Add currently filtered domain if not already in the list
                      ...(!searchParamsObj.domain ||
                      domains.some((d) => d.slug === searchParamsObj.domain)
                        ? []
                        : [
                            {
                              value: searchParamsObj.domain,
                              label: searchParamsObj.domain,
                              hideDuringSearch: true,
                            },
                          ]),
                    ],
              },
              LinkFilterItem,
              {
                key: "root",
                icon: Sliders,
                label: "Link type",
                separatorAfter: true,
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
            ]),
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
        key: "region",
        icon: LocationPin,
        label: "Region",
        options:
          regions?.map(({ region, country, count }) => ({
            value: region,
            label: REGIONS[region] || region.split("-")[1],
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
        key: "trigger",
        icon: CursorRays,
        label: "Trigger",
        options:
          triggers?.map(({ trigger, count }) => ({
            value: trigger,
            label: TRIGGER_DISPLAY[trigger],
            icon: trigger === "qr" ? QRCode : CursorRays,
            right: nFormatter(count, { full: true }),
          })) ?? null,
        separatorAfter: true,
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
        label: "Referrer URL",
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
      {
        key: "url",
        icon: LinkBroken,
        label: "Destination URL",
        getOptionIcon: (_, props) => (
          <LinkLogo
            apexDomain={getApexDomain(props.option?.value)}
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
      ...UTM_PARAMETERS.filter(({ key }) => key !== "ref").map(
        ({ key, label, icon: Icon }) => ({
          key,
          icon: Icon,
          label: `UTM ${label}`,
          getOptionIcon: (value) => (
            <Icon display={value} className="h-4 w-4" />
          ),
          options:
            utmData[key]?.map((dt) => ({
              value: dt[key],
              label: dt[key],
              right: nFormatter(dt.count, { full: true }),
            })) ?? null,
        }),
      ),
    ],
    [
      dashboardProps,
      partnerPage,
      domains,
      links,
      tags,
      folders,
      selectedTags,
      selectedTagIds,
      selectedFolder,
      countries,
      cities,
      devices,
      browsers,
      os,
      referers,
      refererUrls,
      urls,
      utmData,
      tagsAsync,
      domainsAsync,
      foldersAsync,
      loadingTags,
      loadingDomains,
      loadingFolders,
      searchParamsObj.tagIds,
      searchParamsObj.domain,
    ],
  );

  const { isMobile } = useMediaQuery();

  const filterSelect = (
    <Filter.Select
      className="w-full md:w-fit"
      filters={filters}
      activeFilters={activeFilters}
      onSearchChange={setSearch}
      onSelectedFilterChange={setSelectedFilter}
      onSelect={async (key, value) => {
        if (key === "ai") {
          setStreaming(true);
          const prompt = value.replace("Ask AI ", "");
          const { object } = await generateFilters(prompt);
          for await (const partialObject of readStreamableValue(object)) {
            if (partialObject) {
              queryParams({
                set: Object.fromEntries(
                  Object.entries(partialObject).map(([key, value]) => [
                    key,
                    // Convert Dates to ISO strings
                    value instanceof Date ? value.toISOString() : String(value),
                  ]),
                ),
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
                      new URL(`https://${value}`).pathname.slice(1) || "_root",
                  }
                : key === "tagIds"
                  ? {
                      tagIds: selectedTagIds.concat(value).join(","),
                    }
                  : {
                      [key]: value,
                    },
            del: "page",
            scroll: false,
          });
        }
      }}
      onRemove={(key, value) =>
        queryParams(
          key === "tagIds" &&
            !(selectedTagIds.length === 1 && selectedTagIds[0] === value)
            ? {
                set: {
                  tagIds: selectedTagIds.filter((id) => id !== value).join(","),
                },
                scroll: false,
              }
            : {
                del: key === "link" ? ["domain", "key"] : key,
                scroll: false,
              },
        )
      }
      onOpenFilter={(key) =>
        setRequestedFilters((rf) => (rf.includes(key) ? rf : [...rf, key]))
      }
      askAI
    />
  );

  const dateRangePicker = (
    <DateRangePicker
      className="w-full sm:min-w-[200px] md:w-fit"
      align={dashboardProps ? "end" : "center"}
      value={
        start && end
          ? {
              from: start,
              to: end,
            }
          : undefined
      }
      presetId={
        start && end ? undefined : interval ?? DUB_LINKS_ANALYTICS_INTERVAL
      }
      onChange={(range, preset) => {
        if (preset) {
          queryParams({
            del: ["start", "end"],
            set: {
              interval: preset.id,
            },
            scroll: false,
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
          scroll: false,
        });
      }}
      presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
        const requiresUpgrade =
          partnerPage ||
          DUB_DEMO_LINKS.find((l) => l.domain === domain && l.key === key)
            ? false
            : !validDateRangeForPlan({
                plan: plan || dashboardProps?.workspacePlan,
                dataAvailableFrom: createdAt,
                interval: value,
                start,
                end,
              });

        const { startDate, endDate } = getStartEndDates({
          interval: value,
          dataAvailableFrom: createdAt,
        });

        return {
          id: value,
          label: display,
          dateRange: {
            from: startDate,
            to: endDate,
          },
          requiresUpgrade,
          tooltipContent: requiresUpgrade ? (
            <UpgradeTooltip rangeLabel={display} plan={plan} />
          ) : undefined,
          shortcut,
        };
      })}
    />
  );

  return (
    <>
      <div
        className={cn("py-3 md:py-3", {
          "sticky top-14 z-10 bg-neutral-50": dashboardProps,
          "sticky top-16 z-10 bg-neutral-50": adminPage || demoPage,
          "shadow-md": scrolled && dashboardProps,
        })}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-screen-xl flex-col gap-2 px-3 lg:px-10",
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
            {dashboardProps && (
              <a
                className="group flex items-center text-lg font-semibold text-neutral-800"
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
            )}
            <div
              className={cn(
                "flex w-full flex-col-reverse items-center gap-2 min-[550px]:flex-row",
                dashboardProps && "md:w-auto",
              )}
            >
              {isMobile ? dateRangePicker : filterSelect}
              <div
                className={cn("flex w-full grow items-center gap-2 md:w-auto", {
                  "grow-0": dashboardProps,
                })}
              >
                {isMobile ? filterSelect : dateRangePicker}
                {!dashboardProps && (
                  <div className="flex grow justify-end gap-2">
                    {page === "analytics" && !partnerPage && (
                      <>
                        {domain && key && <ShareButton />}
                        <Button
                          variant="secondary"
                          className="w-fit"
                          icon={
                            <SquareLayoutGrid6 className="h-4 w-4 text-neutral-600" />
                          }
                          text={isMobile ? undefined : "Switch to Events"}
                          onClick={() => {
                            if (dashboardProps) {
                              window.open("https://d.to/events");
                            } else {
                              router.push(
                                `/${slug}/events${getQueryString({}, { exclude: ["view"] })}`,
                              );
                            }
                          }}
                        />
                        <AnalyticsOptions />
                      </>
                    )}
                    {page === "events" && !partnerPage && (
                      <>
                        <Button
                          variant="secondary"
                          className="w-fit"
                          icon={
                            <ChartLine className="h-4 w-4 text-neutral-600" />
                          }
                          text={isMobile ? undefined : "Switch to Analytics"}
                          onClick={() =>
                            router.push(`/${slug}/analytics${getQueryString()}`)
                          }
                        />
                        <EventsOptions />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-3 lg:px-10">
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
          onRemove={(key, value) =>
            queryParams(
              key === "tagIds" &&
                !(selectedTagIds.length === 1 && selectedTagIds[0] === value)
                ? {
                    set: {
                      tagIds: selectedTagIds
                        .filter((id) => id !== value)
                        .join(","),
                    },
                    scroll: false,
                  }
                : {
                    del: key === "link" ? ["domain", "key", "url"] : key,
                    scroll: false,
                  },
            )
          }
          onRemoveAll={() =>
            queryParams({
              // Reset all filters except for date range
              del: VALID_ANALYTICS_FILTERS.concat(["page"]).filter(
                (f) => !["interval", "start", "end"].includes(f),
              ),
              scroll: false,
            })
          }
        />
        <div
          className={cn(
            "transition-[height] duration-[300ms]",
            streaming || activeFilters.length ? "h-3" : "h-0",
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
