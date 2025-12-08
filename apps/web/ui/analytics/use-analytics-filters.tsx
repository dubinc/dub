import { generateFilters } from "@/lib/ai/generate-filters";
import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useCustomer from "@/lib/swr/use-customer";
import usePartner from "@/lib/swr/use-partner";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import { LinkProps } from "@/lib/types";
import {
  BlurImage,
  Filter,
  LinkLogo,
  Sliders,
  useRouterStuff,
  UTM_PARAMETERS,
} from "@dub/ui";
import {
  Calendar6,
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
  Receipt2,
  ReferredVia,
  Tag,
  User,
  UserPlus,
  Users,
  Users6,
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
import { FolderIcon } from "../folders/folder-icon";
import { LinkIcon } from "../links/link-icon";
import TagBadge from "../links/tag-badge";
import { GroupColorCircle } from "../partners/groups/group-color-circle";
import {
  AnalyticsContext,
  AnalyticsDashboardProps,
} from "./analytics-provider";
import { ContinentIcon } from "./continent-icon";
import { DeviceIcon } from "./device-icon";
import { ReferrerIcon } from "./referrer-icon";
import { TRIGGER_DISPLAY } from "./trigger-display";
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

  const { queryParams, searchParamsObj } = useRouterStuff();

  const selectedTagIds = useMemo(
    () => searchParamsObj.tagIds?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj.tagIds],
  );

  const selectedCustomerId = searchParamsObj.customerId;

  const { data: selectedCustomerWorkspace } = useCustomer({
    customerId: selectedCustomerId,
  });
  const { data: selectedCustomerPartner } = usePartnerCustomer({
    customerId: selectedCustomerId,
  });

  const selectedCustomer = selectedCustomerPartner || selectedCustomerWorkspace;

  const selectedPartnerId = searchParamsObj.partnerId;
  const { partner: selectedPartner } = usePartner({
    partnerId: selectedPartnerId,
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
    disabled: !isRequested("link"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: folders } = useAnalyticsFilterOption("top_folders", {
    disabled: !isRequested("folderId"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: linkTags } = useAnalyticsFilterOption("top_link_tags", {
    disabled: !isRequested("tagIds"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: domains } = useAnalyticsFilterOption("top_domains", {
    disabled: !isRequested("domain"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: partners } = useAnalyticsFilterOption("top_partners", {
    disabled: !isRequested("partnerId"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: groups } = useAnalyticsFilterOption("top_groups", {
    disabled: !isRequested("groupId"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: countries } = useAnalyticsFilterOption("countries", {
    disabled: !isRequested("country"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: regions } = useAnalyticsFilterOption("regions", {
    disabled: !isRequested("region"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: cities } = useAnalyticsFilterOption("cities", {
    disabled: !isRequested("city"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: continents } = useAnalyticsFilterOption("continents", {
    disabled: !isRequested("continent"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: devices } = useAnalyticsFilterOption("devices", {
    disabled: !isRequested("device"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: browsers } = useAnalyticsFilterOption("browsers", {
    disabled: !isRequested("browser"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: os } = useAnalyticsFilterOption("os", {
    disabled: !isRequested("os"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: triggers } = useAnalyticsFilterOption("triggers", {
    disabled: !isRequested("trigger"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: referers } = useAnalyticsFilterOption("referers", {
    disabled: !isRequested("referer"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: refererUrls } = useAnalyticsFilterOption("referer_urls", {
    disabled: !isRequested("refererUrl"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: urls } = useAnalyticsFilterOption("top_urls", {
    disabled: !isRequested("url"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: utmSources } = useAnalyticsFilterOption("utm_sources", {
    disabled: !isRequested("utm_source"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: utmMediums } = useAnalyticsFilterOption("utm_mediums", {
    disabled: !isRequested("utm_medium"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: utmCampaigns } = useAnalyticsFilterOption("utm_campaigns", {
    disabled: !isRequested("utm_campaign"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: utmTerms } = useAnalyticsFilterOption("utm_terms", {
    disabled: !isRequested("utm_term"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: utmContents } = useAnalyticsFilterOption("utm_contents", {
    disabled: !isRequested("utm_content"),
    omitGroupByFilterKey: true,
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
        ? currencyFormatter(saleAmount)
        : nFormatter(count, { full: true });
    },
    [selectedTab, saleUnit],
  );

  // Some suggestions will only appear if previously requested (see isRequested above)
  const aiFilterSuggestions = useMemo(
    () => [
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
    [dashboardProps, partnerPage],
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

  const DomainFilterItem = {
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
    options:
      domains?.map(({ domain, ...rest }) => ({
        value: domain,
        label: domain,
        right: getFilterOptionTotal(rest),
      })) ?? null,
  };

  const SaleTypeFilterItem = {
    key: "saleType",
    icon: Receipt2,
    label: "Sale type",
    separatorAfter: true,
    options: [
      {
        value: "new",
        label: "New",
        icon: UserPlus,
      },
      {
        value: "recurring",
        label: "Recurring",
        icon: Calendar6,
      },
    ],
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
        ? dashboardProps.key
          ? []
          : [DomainFilterItem, LinkFilterItem]
        : programPage
          ? [
              {
                key: "groupId",
                icon: Users6,
                label: "Group",
                getOptionIcon: (_value, props) => {
                  const group = props.option?.data?.group;
                  return group ? <GroupColorCircle group={group} /> : null;
                },
                options:
                  groups?.map(({ group, ...rest }) => ({
                    value: group.id,
                    icon: <GroupColorCircle group={group} />,
                    label: group.name,
                    data: { group },
                    right: getFilterOptionTotal(rest),
                  })) ?? null,
              },
              {
                key: "partnerId",
                icon: Users,
                label: "Partner",
                options:
                  partners?.map(({ partner, ...rest }) => {
                    return {
                      value: partner.id,
                      label: partner.name,
                      icon: (
                        <img
                          src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                          alt={partner.id}
                          className="size-4 rounded-full"
                        />
                      ),
                      right: getFilterOptionTotal(rest),
                    };
                  }) ?? null,
              },
              SaleTypeFilterItem,
            ]
          : partnerPage
            ? [LinkFilterItem, SaleTypeFilterItem]
            : [
                {
                  key: "folderId",
                  icon: Folder,
                  label: "Folder",
                  getOptionIcon: (_value, props) => {
                    const folder = props.option?.data?.folder;
                    return folder ? (
                      <FolderIcon
                        folder={folder}
                        shape="square"
                        iconClassName="size-3"
                      />
                    ) : null;
                  },
                  options:
                    folders?.map(({ folder, ...rest }) => ({
                      value: folder.id,
                      icon: (
                        <FolderIcon
                          folder={folder}
                          shape="square"
                          iconClassName="size-3"
                        />
                      ),
                      label: folder.name,
                      data: { folder },
                      right: getFilterOptionTotal(rest),
                    })) ?? null,
                },
                {
                  key: "tagIds",
                  icon: Tag,
                  label: "Tag",
                  multiple: true,
                  getOptionIcon: (_value, props) => {
                    const tagColor = props.option?.data?.color;
                    return tagColor ? (
                      <TagBadge color={tagColor} withIcon className="sm:p-1" />
                    ) : null;
                  },
                  options:
                    linkTags?.map(({ tag: { id, name, color }, ...rest }) => ({
                      value: id,
                      icon: (
                        <TagBadge color={color} withIcon className="sm:p-1" />
                      ),
                      label: name,
                      data: { color },
                      right: getFilterOptionTotal(rest),
                    })) ?? null,
                },
                DomainFilterItem,
                LinkFilterItem,
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
                SaleTypeFilterItem,
              ]),
      {
        key: "country",
        icon: FlagWavy,
        label: "Country",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
            className="size-4 shrink-0"
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
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4 shrink-0"
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
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4 shrink-0"
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
                triggers?.map(({ trigger, ...rest }) => {
                  const { title, icon } = TRIGGER_DISPLAY[trigger];
                  return {
                    value: trigger,
                    label: title,
                    icon,
                    right: getFilterOptionTotal(rest),
                  };
                }) ?? null,
              separatorAfter: true,
            },
          ]),
      {
        key: "referer",
        icon: ReferredVia,
        label: "Referer",
        getOptionIcon: (value, props) => (
          <ReferrerIcon display={value} className="h-4 w-4" />
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
                <ReferrerIcon display={value} className="h-4 w-4" />
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
      // additional fields that are hidden in filter dropdown
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        hideInFilterDropdown: true,
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
        options: [],
      },
      {
        key: "partnerId",
        icon: Users6,
        label: "Partner",
        hideInFilterDropdown: true,
        getOptionIcon: () => {
          return selectedPartner ? (
            <img
              src={
                selectedPartner.image || `${OG_AVATAR_URL}${selectedPartner.id}`
              }
              alt={`${selectedPartner.email} avatar`}
              className="size-4 rounded-full"
            />
          ) : null;
        },
        getOptionLabel: () => {
          return selectedPartner?.name ?? selectedPartnerId;
        },
        getOptionPermalink: () => {
          return slug ? `/${slug}/program/partners/${selectedPartnerId}` : null;
        },
        options: [],
      },
    ],
    [
      dashboardProps,
      partnerPage,
      domains,
      links,
      linkTags,
      folders,
      groups,
      selectedTagIds,
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
    onSelect,
    onRemove,
    onRemoveAll,
    onOpenFilter,
    streaming,
    activeFiltersWithStreaming,
  };
}
