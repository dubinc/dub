import usePartnerCustomersCount from "@/lib/swr/use-partner-customers-count";
import { useRouterStuff } from "@dub/ui";
import { Globe, Hyperlink } from "@dub/ui/icons";
import { COUNTRIES, linkConstructor, nFormatter } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";

export function usePartnerCustomerFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: countriesCount } = usePartnerCustomersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "country",
    },
    enabled: selectedFilter === "country" || !!searchParamsObj.country,
  });

  const { data: linksCount } = usePartnerCustomersCount<
    | {
        linkId: string;
        domain: string;
        key: string;
        shortLink: string;
        _count: number;
      }[]
    | undefined
  >({
    query: { groupBy: "linkId" },
    enabled: selectedFilter === "linkId" || !!searchParamsObj.linkId,
  });

  const filters = useMemo(
    () => [
      {
        key: "country",
        icon: Globe,
        label: "Country",
        options:
          countriesCount?.map(({ country, _count }) => ({
            value: country,
            label: COUNTRIES[country] || country,
            icon: (
              <img
                alt={`${country} flag`}
                src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                className="size-4"
              />
            ),
            right: nFormatter(_count, { full: true }),
          })) ?? null,
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        options:
          linksCount?.map(({ linkId, domain, key, shortLink, _count }) => ({
            value: linkId,
            label: linkConstructor({ domain, key, pretty: true }),
            data: { shortLink },
            right: nFormatter(_count, { full: true }),
          })) ?? null,
      },
    ],
    [countriesCount, linksCount],
  );

  const activeFilters = useMemo(() => {
    const { country, linkId } = searchParamsObj;
    return [
      ...(country ? [{ key: "country", value: country }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: {
          [key]: value,
        },
        del: "page",
        scroll: false,
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
        scroll: false,
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["country", "linkId", "search", "page"],
        scroll: false,
      }),
    [queryParams],
  );

  const isFiltered = useMemo(
    () => activeFilters.length > 0 || !!searchParamsObj.search,
    [activeFilters, searchParamsObj.search],
  );

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
    setSelectedFilter,
  };
}
