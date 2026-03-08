import useCustomersCount from "@/lib/swr/use-customers-count";
import usePartners from "@/lib/swr/use-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { LinkLogo, useRouterStuff } from "@dub/ui";
import { FlagWavy, Hyperlink, SquareUserSparkle2, Users } from "@dub/ui/icons";
import {
  COUNTRIES,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
  OG_AVATAR_URL,
} from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function useCustomerFilters(
  extraSearchParams: Record<string, string>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId, slug } = useWorkspace();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { partners } = usePartnerFilterOptions(
    selectedFilter === "partnerId" ? debouncedSearch : "",
  );

  const { data: countriesCount } = useCustomersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "country",
    },
    enabled,
  });

  const { data: linksCount } = useCustomersCount<
    | {
        linkId: string;
        shortLink: string;
        url: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "linkId",
    },
    enabled,
  });

  const filters = useMemo(
    () => [
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
          countriesCount
            ?.filter(({ country }) => COUNTRIES[country])
            .map(({ country, _count }) => ({
              value: country,
              label: COUNTRIES[country],
              right: nFormatter(_count, { full: true }),
              permalink: `/${slug}/analytics?event=leads&country=${country}`,
            })) ?? [],
        meta: {
          filterParams: ({ getValue }) => ({
            country: getValue(),
          }),
        },
      },
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        shouldFilter: false,
        options:
          partners?.map(({ id, name, image }) => {
            return {
              value: id,
              label: name,
              icon: (
                <img
                  src={image || `${OG_AVATAR_URL}${id}`}
                  alt={`${name} image`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        getOptionIcon: (_value, props) => (
          <LinkLogo
            apexDomain={getApexDomain(props.option?.data?.url)}
            className="size-4 shrink-0 sm:size-4"
          />
        ),
        options:
          linksCount?.map(({ linkId, shortLink, url, _count }) => ({
            value: linkId,
            label: getPrettyUrl(shortLink),
            right: nFormatter(_count, { full: true }),
            permalink: `/${slug}/links/${getPrettyUrl(shortLink)}`,
            data: { url },
          })) ?? [],
        meta: {
          filterParams: ({ getValue }) => ({
            linkId: getValue(),
          }),
        },
      },
      {
        key: "externalId",
        icon: SquareUserSparkle2,
        label: "External ID",
        options: [],
        meta: {
          filterParams: ({ getValue }) => ({
            externalId: getValue(),
          }),
        },
      },
    ],
    [partners, countriesCount, linksCount, slug],
  );

  const activeFilters = useMemo(() => {
    const { country, linkId, externalId, partnerId } = searchParamsObj;

    return [
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
      ...(externalId ? [{ key: "externalId", value: externalId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["partnerId", "country", "linkId", "externalId", "search"],
      }),
    [queryParams],
  );

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
        ...extraSearchParams,
      }).toString(),
    [activeFilters, workspaceId, extraSearchParams],
  );

  const isFiltered = useMemo(
    () => activeFilters.length > 0 || searchParamsObj.search,
    [activeFilters, searchParamsObj.search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
    setSearch,
    setSelectedFilter,
  };
}

function usePartnerFilterOptions(search: string) {
  const { searchParamsObj } = useRouterStuff();

  const { partners, loading: partnersLoading } = usePartners({
    query: { search },
  });

  const { partners: selectedPartners } = usePartners({
    query: {
      partnerIds: searchParamsObj.partnerId
        ? [searchParamsObj.partnerId]
        : undefined,
    },
  });

  const result = useMemo(() => {
    return partnersLoading ||
      // Consider partners loading if we can't find the currently filtered partner
      (searchParamsObj.partnerId &&
        ![...(selectedPartners ?? []), ...(partners ?? [])].some(
          (p) => p.id === searchParamsObj.partnerId,
        ))
      ? null
      : ([
          ...(partners ?? []),
          // Add selected partner to list if not already in partners
          ...(selectedPartners
            ?.filter((st) => !partners?.some((t) => t.id === st.id))
            ?.map((st) => ({ ...st, hideDuringSearch: true })) ?? []),
        ] as (EnrolledPartnerProps & { hideDuringSearch?: boolean })[]);
  }, [partnersLoading, partners, selectedPartners, searchParamsObj.partnerId]);

  return { partners: result };
}
