import { CountryFlag } from "@/ui/shared/country-flag";
import { useRouterStuff } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import { COUNTRIES, nFormatter } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useNetworkReferralsCount } from "./use-network-referrals-count";

export function useNetworkReferralFilters({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: countriesCount } = useNetworkReferralsCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "country",
    },
    enabled:
      enabled && (selectedFilter === "country" || !!searchParamsObj.country),
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
            icon: <CountryFlag countryCode={country} />,
            right: nFormatter(_count, { full: true }),
          })) ?? null,
      },
    ],
    [countriesCount],
  );

  const activeFilters = useMemo(() => {
    const { country } = searchParamsObj;
    return [...(country ? [{ key: "country", value: country }] : [])];
  }, [searchParamsObj]);

  const onSelect = useCallback(
    (key: string, value: unknown) =>
      queryParams({
        set: {
          [key]: value as string | string[],
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
        del: ["country", "page"],
        scroll: false,
      }),
    [queryParams],
  );

  const isFiltered = useMemo(() => activeFilters.length > 0, [activeFilters]);

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
