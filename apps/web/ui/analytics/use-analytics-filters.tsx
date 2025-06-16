import { generateFilters } from "@/lib/ai/generate-filters";
import {
  TRIGGER_DISPLAY,
  VALID_ANALYTICS_FILTERS,
} from "@/lib/analytics/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useCustomer from "@/lib/swr/use-customer";
import useCustomers from "@/lib/swr/use-customers";
import useCustomersCount from "@/lib/swr/use-customers-count";
import useDomains from "@/lib/swr/use-domains";
import useDomainsCount from "@/lib/swr/use-domains-count";
import useFolder from "@/lib/swr/use-folder";
import useFolders from "@/lib/swr/use-folders";
import useFoldersCount from "@/lib/swr/use-folders-count";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import useTags from "@/lib/swr/use-tags";
import useTagsCount from "@/lib/swr/use-tags-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/customers";
import { DOMAINS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/domains";
import { FOLDERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/folders";
import { TAGS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/tags";
import {
  BlurImage,
  Filter,
  LinkLogo,
  Sliders,
  useRouterStuff,
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
  User,
  Users,
  Window,
} from "@dub/ui/icons";
import {
  capitalize,
  CONTINENTS,
  COUNTRIES,
  currencyFormatter,
  getApexDomain,
  GOOGLE_FAVICON_URL,
  linkConstructor,
  nFormatter,
  OG_AVATAR_URL,
  REGIONS,
} from "@dub/utils";
import { readStreamableValue } from "ai/rsc";
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import {
  ComponentProps,
  ContextType,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useDebounce } from "use-debounce";
import { FolderIcon } from "../folders/folder-icon";
import { LinkIcon } from "../links/link-icon";
import TagBadge from "../links/tag-badge";
import {
  AnalyticsContext,
  AnalyticsDashboardProps,
} from "./analytics-provider";
import ContinentIcon from "./continent-icon";
import DeviceIcon from "./device-icon";
import RefererIcon from "./referer-icon";
import { useAnalyticsFilterOption } from "./utils";

export function useAnalyticsFilters({
  partnerPage,
  dashboardProps,
  context,
  programPage = false,
}: {
  partnerPage?: boolean;
  dashboardProps?: AnalyticsDashboardProps;
  context?: Pick<
    ContextType<typeof AnalyticsContext>,
    | "baseApiPath"
    | "queryString"
    | "selectedTab"
    | "saleUnit"
    | "requiresUpgrade"
  >;
  programPage?: boolean;
} = {}) {
  const { selectedTab, saleUnit } = context ?? useContext(AnalyticsContext);

  const { slug, programSlug } = useParams();
  const { plan } = useWorkspace();

  const { queryParams, searchParamsObj } = useRouterStuff();

  // Determine whether filters should be fetched async
  const { data: tagsCount } = useTagsCount();
  const { data: domainsCount } = useDomainsCount({ ignoreParams: true });
  const { data: foldersCount } = useFoldersCount();
  const { data: customersCount } = useCustomersCount();
  const tagsAsync = Boolean(tagsCount && tagsCount > TAGS_MAX_PAGE_SIZE);
  const domainsAsync = domainsCount && domainsCount > DOMAINS_MAX_PAGE_SIZE;
  const foldersAsync = foldersCount && foldersCount > FOLDERS_MAX_PAGE_SIZE;
  const customersAsync =
    customersCount && customersCount > CUSTOMERS_MAX_PAGE_SIZE;

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
  const { customers } = useCustomers({
    query: {
      search:
        customersAsync && selectedFilter === "customerId"
          ? debouncedSearch
          : "",
    },
  });
  const { canManageCustomers } = getPlanCapabilities(plan);

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

  const selectedCustomerId = searchParamsObj.customerId;

  const { data: selectedCustomerWorkspace } = useCustomer({
    customerId: selectedCustomerId,
  });
  const { data: selectedCustomerPartner } = usePartnerCustomer({
    customerId: selectedCustomerId,
  });

  const selectedCustomer = selectedCustomerPartner || selectedCustomerWorkspace;

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
      // Handle customerId special case
      ...(selectedCustomer
        ? [
            {
              key: "customerId",
              value:
                selectedCustomer.email ||
                selectedCustomer["name"] ||
                selectedCustomer["externalId"],
            },
          ]
        : []),
    ];

    // Handle all other filters dynamically
    VALID_ANALYTICS_FILTERS.forEach((filter) => {
      // Skip special cases we handled above
      if (
        ["domain", "key", "tagId", "tagIds", "root", "customerId"].includes(
          filter,
        )
      )
        return;
      // also skip date range filters and qr
      if (["interval", "start", "end", "qr"].includes(filter)) return;

      const value = params[filter];
      if (value) {
        filters.push({ key: filter, value });
      }
    });

    return filters;
  }, [
    searchParamsObj,
    selectedTagIds,
    partnerPage,
    selectedCustomerId,
    selectedCustomer,
  ]);

  const isRequested = useCallback(
    (key: string) =>
      requestedFilters.includes(key) ||
      activeFilters.some((af) => af.key === key),
    [requestedFilters, activeFilters],
  );

  const { data: links } = useAnalyticsFilterOption("top_links", {
    cacheOnly: !isRequested("link"),
    context,
  });
  const { data: partners } = useAnalyticsFilterOption("top_partners", {
    cacheOnly: !isRequested("partnerId"),
    context,
  });
  const { data: countries } = useAnalyticsFilterOption("countries", {
    cacheOnly: !isRequested("country"),
    context,
  });
  const { data: regions } = useAnalyticsFilterOption("regions", {
    cacheOnly: !isRequested("region"),
    context,
  });
  const { data: cities } = useAnalyticsFilterOption("cities", {
    cacheOnly: !isRequested("city"),
    context,
  });
  const { data: continents } = useAnalyticsFilterOption("continents", {
    cacheOnly: !isRequested("continent"),
    context,
  });
  const { data: devices } = useAnalyticsFilterOption("devices", {
    cacheOnly: !isRequested("device"),
    context,
  });
  const { data: browsers } = useAnalyticsFilterOption("browsers", {
    cacheOnly: !isRequested("browser"),
    context,
  });
  const { data: os } = useAnalyticsFilterOption("os", {
    cacheOnly: !isRequested("os"),
    context,
  });
  const { data: triggers } = useAnalyticsFilterOption("triggers", {
    cacheOnly: !isRequested("trigger"),
    context,
  });
  const { data: referers } = useAnalyticsFilterOption("referers", {
    cacheOnly: !isRequested("referer"),
    context,
  });
  const { data: refererUrls } = useAnalyticsFilterOption("referer_urls", {
    cacheOnly: !isRequested("refererUrl"),
    context,
  });
  const { data: urls } = useAnalyticsFilterOption("top_urls", {
    cacheOnly: !isRequested("url"),
    context,
  });
  const { data: utmSources } = useAnalyticsFilterOption("utm_sources", {
    cacheOnly: !isRequested("utm_source"),
    context,
  });
  const { data: utmMediums } = useAnalyticsFilterOption("utm_mediums", {
    cacheOnly: !isRequested("utm_medium"),
    context,
  });
  const { data: utmCampaigns } = useAnalyticsFilterOption("utm_campaigns", {
    cacheOnly: !isRequested("utm_campaign"),
    context,
  });
  const { data: utmTerms } = useAnalyticsFilterOption("utm_terms", {
    cacheOnly: !isRequested("utm_term"),
    context,
  });
  const { data: utmContents } = useAnalyticsFilterOption("utm_contents", {
    cacheOnly: !isRequested("utm_content"),
    context,
  });

  const utmData = {
    utm_source: utmSources,
    utm_medium: utmMediums,
    utm_campaign: utmCampaigns,
    utm_term: utmTerms,
    utm_content: utmContents,
  };

  const getFilterOptionTotal = useCallback(
    ({ count, saleAmount }: { count?: number; saleAmount?: number }) => {
      return selectedTab === "sales" && saleUnit === "saleAmount" && saleAmount
        ? currencyFormatter(saleAmount / 100)
        : nFormatter(count, { full: true });
    },
    [selectedTab, saleUnit],
  );

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
        ({ domain, key, url, ...rest }: LinkProps & { count?: number }) => ({
          value: linkConstructor({ domain, key, pretty: true }),
          label: linkConstructor({ domain, key, pretty: true }),
          right: getFilterOptionTotal(rest),
          data: { url },
          permalink:
            slug && !partnerPage
              ? `/${slug}/links/${linkConstructor({ domain, key, pretty: true })}`
              : undefined,
        }),
      ) ?? null,
  };

  const CustomerFilterItem = {
    key: "customerId",
    icon: User,
    label: "Customer",
    hideInFilterDropdown: partnerPage,
    shouldFilter: !customersAsync,
    getOptionIcon: () => {
      return selectedCustomer ? (
        <img
          src={
            selectedCustomer["avatar"] ||
            `${OG_AVATAR_URL}${selectedCustomer.id}`
          }
          alt={`${selectedCustomer.email} avatar`}
          className="size-4 rounded-full"
        />
      ) : null;
    },
    getOptionPermalink: () => {
      return programSlug
        ? `/programs/${programSlug}/customers/${selectedCustomerId}`
        : slug
          ? `/${slug}/customers/${selectedCustomerId}`
          : null;
    },
    options:
      customers?.map(({ id, email, name, avatar }) => {
        return {
          value: id,
          label: email ?? name,
          icon: (
            <img
              src={avatar || `${OG_AVATAR_URL}${id}`}
              alt={`${email} avatar`}
              className="size-4 rounded-full"
            />
          ),
        };
      }) ?? null,
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
        : programPage
          ? [
              {
                key: "partnerId",
                icon: Users,
                label: "Partner",
                separatorAfter: true,
                options:
                  partners?.map(({ partner, ...rest }) => {
                    return {
                      value: partner.id,
                      label: partner.name,
                      icon: (
                        <img
                          src={
                            partner.image || `${OG_AVATAR_URL}${partner.name}`
                          }
                          alt={`${partner.name} image`}
                          className="size-4 rounded-full"
                        />
                      ),
                      right: getFilterOptionTotal(rest),
                    };
                  }) ?? null,
              },
            ]
          : partnerPage
            ? [LinkFilterItem, CustomerFilterItem]
            : [
                ...(canManageCustomers ? [CustomerFilterItem] : []),
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
            src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
            className="h-2.5 w-4"
          />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options:
          countries?.map(({ country, ...rest }) => ({
            value: country,
            label: COUNTRIES[country],
            right: getFilterOptionTotal(rest),
          })) ?? null,
      },
      {
        key: "city",
        icon: OfficeBuilding,
        label: "City",
        options:
          cities?.map(({ city, country, ...rest }) => ({
            value: city,
            label: city,
            icon: (
              <img
                alt={country}
                src={`https://flag.vercel.app/m/${country}.svg`}
                className="h-2.5 w-4"
              />
            ),
            right: getFilterOptionTotal(rest),
          })) ?? null,
      },
      {
        key: "region",
        icon: LocationPin,
        label: "Region",
        options:
          regions?.map(({ region, country, ...rest }) => ({
            value: region,
            label: REGIONS[region] || region.split("-")[1],
            icon: (
              <img
                alt={country}
                src={`https://flag.vercel.app/m/${country}.svg`}
                className="h-2.5 w-4"
              />
            ),
            right: getFilterOptionTotal(rest),
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
          continents?.map(({ continent, ...rest }) => ({
            value: continent,
            label: CONTINENTS[continent],
            right: getFilterOptionTotal(rest),
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
          devices?.map(({ device, ...rest }) => ({
            value: device,
            label: device,
            right: getFilterOptionTotal(rest),
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
          browsers?.map(({ browser, ...rest }) => ({
            value: browser,
            label: browser,
            right: getFilterOptionTotal(rest),
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
          os?.map(({ os, ...rest }) => ({
            value: os,
            label: os,
            right: getFilterOptionTotal(rest),
          })) ?? null,
      },
      ...(programPage
        ? []
        : [
            {
              key: "trigger",
              icon: CursorRays,
              label: "Trigger",
              options:
                triggers?.map(({ trigger, ...rest }) => ({
                  value: trigger,
                  label: TRIGGER_DISPLAY[trigger],
                  icon: trigger === "qr" ? QRCode : CursorRays,
                  right: getFilterOptionTotal(rest),
                })) ?? null,
              separatorAfter: true,
            },
          ]),
      {
        key: "referer",
        icon: ReferredVia,
        label: "Referer",
        getOptionIcon: (value, props) => (
          <RefererIcon display={value} className="h-4 w-4" />
        ),
        options:
          referers?.map(({ referer, ...rest }) => ({
            value: referer,
            label: referer,
            right: getFilterOptionTotal(rest),
          })) ?? null,
      },
      ...(programPage
        ? []
        : [
            {
              key: "refererUrl",
              icon: ReferredVia,
              label: "Referrer URL",
              getOptionIcon: (value, props) => (
                <RefererIcon display={value} className="h-4 w-4" />
              ),
              options:
                refererUrls?.map(({ refererUrl, ...rest }) => ({
                  value: refererUrl,
                  label: refererUrl,
                  right: getFilterOptionTotal(rest),
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
                urls?.map(({ url, ...rest }) => ({
                  value: url,
                  label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                  right: getFilterOptionTotal(rest),
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
          ]),
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
      selectedCustomerId,
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

  const onSelect = useCallback(
    async (key, value) => {
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
                  key: new URL(`https://${value}`).pathname.slice(1) || "_root",
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
    },
    [queryParams, activeFilters, selectedTagIds],
  );

  const onRemove = useCallback(
    (key, value) =>
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
              del: key === "link" ? ["domain", "key", "url"] : key,
              scroll: false,
            },
      ),
    [queryParams, selectedTagIds],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        // Reset all filters except for date range
        del: VALID_ANALYTICS_FILTERS.concat(["page"]).filter(
          (f) => !["interval", "start", "end"].includes(f),
        ),
        scroll: false,
      }),
    [queryParams],
  );

  const onOpenFilter = useCallback(
    (key) =>
      setRequestedFilters((rf) => (rf.includes(key) ? rf : [...rf, key])),
    [],
  );

  const activeFiltersWithStreaming = useMemo(
    () => [
      ...activeFilters,
      ...(streaming && !activeFilters.length
        ? Array.from({ length: 2 }, (_, i) => i).map((i) => ({
            key: "loader",
            value: i,
          }))
        : []),
    ],
    [activeFilters, streaming],
  );

  return {
    filters,
    activeFilters,
    setSearch,
    setSelectedFilter,
    onSelect,
    onRemove,
    onRemoveAll,
    onOpenFilter,
    streaming,
    activeFiltersWithStreaming,
  };
}
