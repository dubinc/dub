import { generateFilters } from "@/lib/ai/generate-filters";
import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useCustomer from "@/lib/swr/use-customer";
import usePartner from "@/lib/swr/use-partner";
import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import { usePartnerTags } from "@/lib/swr/use-partner-tags";
import { LinkProps } from "@/lib/types";
import { readStreamableValue } from "@ai-sdk/rsc";
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
  parseFilterValue,
  REGIONS,
  type FilterOperator,
  type ParsedFilter,
} from "@dub/utils";
import { useParams } from "next/navigation";
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

  const { slug } = useParams();

  const { queryParams, searchParamsObj } = useRouterStuff();

  const selectedTagIds = useMemo(
    () => searchParamsObj.tagIds?.split(",")?.filter(Boolean) ?? [],
    [searchParamsObj.tagIds],
  );

  const partnerTagIdParsed = useMemo(
    () => parseFilterValue(searchParamsObj.partnerTagId),
    [searchParamsObj.partnerTagId],
  );

  const { partnerTags: partnerTagsById } = usePartnerTags(
    {
      query: { ids: partnerTagIdParsed?.values },
      enabled:
        !!partnerTagIdParsed?.values?.length && !!programPage,
    },
    { keepPreviousData: true },
  );

  const partnerTagIdToName = useMemo(
    () =>
      new Map(
        (partnerTagsById ?? []).map((t) => [t.id, t.name]),
      ),
    [partnerTagsById],
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

  const parseFilterParam = useCallback(
    (value: string): ParsedFilter | undefined => {
      return parseFilterValue(value);
    },
    [],
  );

  const activeFilters = useMemo(() => {
    const { domain, key, root, folderId, ...params } = searchParamsObj;

    // Handle special cases first
    const filters: Array<{
      key: string;
      operator: FilterOperator;
      values: any[];
    }> = [
      // Legacy: show one link chip when domain+key are present (no linkId)
      ...(domain && key && !params.linkId
        ? [
            {
              key: "linkId",
              operator: "IS" as FilterOperator,
              values: [linkConstructor({ domain, key, pretty: true })],
            },
          ]
        : []),
      // Handle tagIds special case
      ...(selectedTagIds.length > 0
        ? [
            {
              key: "tagIds",
              operator: "IS_ONE_OF" as FilterOperator,
              values: selectedTagIds,
            },
          ]
        : []),
      // Handle partnerTagId special case
      ...(partnerTagIdParsed?.values?.length
        ? [
            {
              key: "partnerTagId",
              operator: partnerTagIdParsed.operator as FilterOperator,
              values: partnerTagIdParsed.values,
            },
          ]
        : []),
      // Handle root special case
      ...(root
        ? [
            {
              key: "root",
              operator: "IS" as FilterOperator,
              values: [root],
            },
          ]
        : []),
      // Handle folderId special case
      ...(folderId
        ? [
            {
              key: "folderId",
              operator: "IS" as FilterOperator,
              values: [folderId],
            },
          ]
        : []),
      // Handle customerId special case
      ...(selectedCustomer
        ? [
            {
              key: "customerId",
              operator: "IS" as FilterOperator,
              values: [
                selectedCustomer.email ||
                  selectedCustomer["name"] ||
                  selectedCustomer["externalId"],
              ],
            },
          ]
        : []),
    ];

    // Handle all filters dynamically (including domain, tagId, folderId, root)
    VALID_ANALYTICS_FILTERS.forEach((filter) => {
      // Skip special cases we handled above
      if (
        [
          "domain",
          "key",
          "tagId",
          "tagIds",
          "partnerTagId",
          "root",
          "customerId",
        ].includes(filter)
      )
        return;
      // Also skip date range filters and qr
      if (["interval", "start", "end", "qr"].includes(filter)) return;
      // Skip domain if we're showing a specific link (domain + key) without linkId
      if (filter === "domain" && domain && key && !params.linkId) return;

      const value =
        params[filter] ||
        (filter === "domain" ? domain : filter === "root" ? root : undefined);

      if (value) {
        const parsed = parseFilterParam(value);
        if (parsed) {
          filters.push({
            key: filter,
            operator: parsed.operator,
            values: parsed.values,
          });
        }
      }
    });

    return filters;
  }, [
    searchParamsObj,
    selectedTagIds,
    partnerTagIdParsed,
    partnerPage,
    selectedCustomerId,
    selectedCustomer,
    parseFilterParam,
  ]);

  const isRequested = useCallback(
    (key: string) =>
      requestedFilters.includes(key) ||
      activeFilters.some((af) => af.key === key),
    [requestedFilters, activeFilters],
  );

  const { data: links } = useAnalyticsFilterOption("top_links", {
    disabled: !isRequested("linkId"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: folders } = useAnalyticsFilterOption("top_folders", {
    disabled: !isRequested("folderId"),
    omitGroupByFilterKey: true,
    context,
  });
  const { data: linkTags } = useAnalyticsFilterOption("top_link_tags", {
    disabled: !isRequested("tagId"),
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
  const { data: partnerTags } = useAnalyticsFilterOption("top_partner_tags", {
    disabled: !isRequested("partnerTagId"),
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
  const { data: baseUrls } = useAnalyticsFilterOption("top_base_urls", {
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
    key: "linkId",
    icon: Hyperlink,
    label: "Link",
    getOptionIcon: (_value, props) => {
      const data = props.option?.data;
      const url = data?.url;
      return <LinkIcon url={url} />;
    },
    options:
      links?.map(
        ({
          id,
          domain,
          key,
          url,
          ...rest
        }: LinkProps & { id?: string; count?: number }) => ({
          value: id,
          label: linkConstructor({ domain, key, pretty: true }),
          right: getFilterOptionTotal(rest),
          data: { url, domain, key },
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
    hideMultipleIcons: true,
    singleSelect: true,
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
        singleSelect: true,
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
              {
                key: "partnerTagId",
                icon: Tag,
                label: "Partner tag",
                multiple: true,
                getOptionLabel: (value) =>
                  partnerTagIdToName.get(value) ?? null,
                options:
                  partnerTags?.map(({ partnerTag, ...rest }) => ({
                    value: partnerTag.id,
                    label: partnerTag.name,
                    right: getFilterOptionTotal(rest),
                  })) ?? null,
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
                  key: "tagId",
                  icon: Tag,
                  label: "Tag",
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
                  hideMultipleIcons: true,
                  singleSelect: true,
                  options: [
                    {
                      value: "true",
                      icon: Globe2,
                      label: "Root domain link",
                    },
                    {
                      value: "false",
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
        labelPlural: "countries",
        getOptionIcon: (value) => {
          if (typeof value !== "string") return null;

          return (
            <img
              alt={value}
              src={`https://hatscripts.github.io/circle-flags/flags/${value.toLowerCase()}.svg`}
              className="size-4 shrink-0"
            />
          );
        },
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
        labelPlural: "cities",
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
        getOptionIcon: (value) => {
          if (typeof value !== "string") return null;
          return (
            <ContinentIcon
              display={value}
              className="size-4 rounded-full border border-cyan-500"
            />
          );
        },
        getOptionLabel: (value) => {
          if (typeof value !== "string") return String(value);
          return CONTINENTS[value] || value;
        },
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
        hideMultipleIcons: true,
        getOptionIcon: (value) => {
          if (typeof value !== "string") return null;
          return (
            <DeviceIcon
              display={capitalize(value) ?? value}
              tab="devices"
              className="h-4 w-4"
            />
          );
        },
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
        getOptionIcon: (value) => {
          if (typeof value !== "string") return null;
          return (
            <DeviceIcon display={value} tab="browsers" className="h-4 w-4" />
          );
        },
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
        labelPlural: "OS",
        hideMultipleIcons: true,
        getOptionIcon: (value) => {
          if (typeof value !== "string") return null;
          return <DeviceIcon display={value} tab="os" className="h-4 w-4" />;
        },
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
              hideMultipleIcons: true,
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
        label: "Referrer",
        getOptionIcon: (value, _props) => {
          if (typeof value !== "string") return null;
          return <ReferrerIcon display={value} className="h-4 w-4" />;
        },
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
              getOptionIcon: (value, props) => {
                if (typeof value !== "string") return null;
                return <ReferrerIcon display={value} className="h-4 w-4" />;
              },
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
                baseUrls?.map(({ url, ...rest }) => ({
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
                getOptionIcon: (value) => {
                  if (typeof value !== "string") return null;
                  return <Icon display={value} className="h-4 w-4" />;
                },
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
        singleSelect: true,
        hideMultipleIcons: true,
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
          return programPage
            ? `/${slug}/program/customers/${selectedCustomerId}`
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
      partnerTags,
      partnerTagIdToName,
      selectedTagIds,
      partnerTagIdParsed,
      selectedCustomerId,
      countries,
      cities,
      devices,
      browsers,
      os,
      referers,
      refererUrls,
      baseUrls,
      utmData,
      searchParamsObj.tagId,
      searchParamsObj.domain,
    ],
  );

  const onSelect = useCallback(
    async (key, value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          queryParams({
            del: key,
            scroll: false,
          });
        } else {
          const currentParam = searchParamsObj[key];
          const isNegated = currentParam?.startsWith("-") ?? false;

          const newParam = isNegated ? `-${value.join(",")}` : value.join(",");

          queryParams({
            set: { [key]: newParam },
            del: "page",
            scroll: false,
          });
        }

        return;
      }

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
        setStreaming(false);
      } else {
        const currentParam = searchParamsObj[key];
        const filterDef = filters.find((f) => f.key === key);
        const isSingleSelect = filterDef?.singleSelect;

        if (!currentParam || isSingleSelect) {
          queryParams({
            set: { [key]: value },
            del: "page",
            scroll: false,
          });
        } else {
          const parsed = parseFilterParam(currentParam);

          if (parsed && !parsed.values.includes(value)) {
            const newValues = [...parsed.values, value];
            const newParam = parsed.operator.includes("NOT")
              ? `-${newValues.join(",")}`
              : newValues.join(",");

            queryParams({
              set: { [key]: newParam },
              del: "page",
              scroll: false,
            });
          }
        }
      }
    },
    [queryParams, activeFilters, searchParamsObj, parseFilterParam, filters],
  );

  const onRemove = useCallback(
    (key, value) => {
      // Handle link filter when represented by domain+key (no linkId in URL)
      if (
        key === "linkId" &&
        searchParamsObj.domain &&
        searchParamsObj.key &&
        !searchParamsObj.linkId
      ) {
        queryParams({ del: ["domain", "key"], scroll: false });
        return;
      }

      const currentParam = searchParamsObj[key];

      if (!currentParam) return;

      const parsed = parseFilterParam(currentParam);
      if (!parsed) {
        queryParams({ del: key, scroll: false });
        return;
      }

      const newValues = parsed.values.filter((v) => v !== value);

      if (newValues.length === 0) {
        queryParams({ del: key, scroll: false });
      } else {
        const newParam = parsed.operator.includes("NOT")
          ? `-${newValues.join(",")}`
          : newValues.join(",");

        queryParams({
          set: { [key]: newParam },
          scroll: false,
        });
      }
    },
    [queryParams, searchParamsObj, parseFilterParam],
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

  const onOpenFilter = useCallback((key) => {
    setRequestedFilters((rf) => (rf.includes(key) ? rf : [...rf, key]));
  }, []);

  const onToggleOperator = useCallback(
    (key) => {
      const currentParam = searchParamsObj[key];
      if (!currentParam) return;

      const isNegated = currentParam.startsWith("-");
      const cleanValue = isNegated ? currentParam.slice(1) : currentParam;

      const newParam = isNegated ? cleanValue : `-${cleanValue}`;

      queryParams({
        set: { [key]: newParam },
        del: "page",
        scroll: false,
      });
    },
    [searchParamsObj, queryParams],
  );

  const onRemoveFilter = useCallback(
    (key) => queryParams({ del: key, scroll: false }),
    [queryParams],
  );

  const activeFiltersWithStreaming = useMemo(() => {
    return [
      ...activeFilters,
      ...(streaming && !activeFilters.length
        ? Array.from({ length: 2 }, (_, i) => i).map((i) => ({
            key: "loader",
            values: [String(i)],
            operator: "IS" as const,
          }))
        : []),
    ];
  }, [activeFilters, streaming]);

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onOpenFilter,
    onToggleOperator,
    streaming,
    activeFiltersWithStreaming,
  };
}
