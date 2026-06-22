import { REACH_TIER_KEYS, REACH_TIERS } from "@/lib/api/network/reach-tiers";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import { CountryFlag } from "@/ui/shared/country-flag";
import { useRouterStuff } from "@dub/ui";
import { FlagWavy, User } from "@dub/ui/icons";
import { COUNTRIES, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";

export function usePartnerNetworkFilters({
  status,
}: {
  status: "discover" | "invited" | "recruited" | "ignored";
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  // Apply filter changes via the History API (instant) rather than router.push,
  // which would trigger a full RSC navigation per click. See page-client for the
  // rationale — all data here is client-side SWR keyed off useSearchParams.
  const updateSearchParams = useCallback(
    (opts: { set?: Record<string, string | string[]>; del?: string | string[] }) => {
      const newPath = queryParams({ ...opts, getNewPath: true }) as string;
      window.history.pushState(null, "", newPath);
    },
    [queryParams],
  );

  const { data: countriesCount } = useNetworkPartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      status,
      groupBy: "country",
    },
    excludeParams: ["country"],
  });

  const filters = useMemo(
    () => [
      {
        key: "country",
        icon: FlagWavy,
        label: "Partner country",
        getOptionIcon: (value) => (
          <CountryFlag countryCode={value} className="size-3.5 rounded-full" />
        ),
        getOptionLabel: (value) => COUNTRIES[value],
        options:
          countriesCount
            ?.filter(({ country }) => COUNTRIES[country])
            .map(({ country, _count }) => ({
              value: country,
              label: COUNTRIES[country],
              right: nFormatter(_count, { full: true }),
            })) ?? [],
      },
      {
        key: "reach",
        icon: User,
        label: "Creator size",
        multiple: true,
        // Range leads (objective); the muted descriptor sits on the right.
        options: REACH_TIER_KEYS.map((tier) => ({
          value: tier,
          label: REACH_TIERS[tier].range,
          right: REACH_TIERS[tier].descriptor,
        })),
      },
    ],
    [countriesCount],
  );

  const multiFilters = useMemo(
    () => ({
      reach: searchParamsObj.reach?.split(",").filter(Boolean) ?? [],
    }),
    [searchParamsObj.reach],
  ) as Record<string, string[]>;

  const activeFilters = useMemo(() => {
    const { country } = searchParamsObj;

    return [
      // Multi-select filters use the plural `values` shape so the Filter component
      // reflects each option's checked state and renders per-value labels/icons.
      ...Object.entries(multiFilters)
        .map(([key, values]) => ({ key, values }))
        .filter(({ values }) => values.length > 0),

      ...(country ? [{ key: "country", value: country }] : []),
    ];
  }, [searchParamsObj, multiFilters]);

  const onSelect = useCallback(
    (key: string, value: any) =>
      updateSearchParams({
        set: Object.keys(multiFilters).includes(key)
          ? {
              [key]: multiFilters[key].concat(value).join(","),
            }
          : {
              [key]: value,
            },
        del: "page",
      }),
    [updateSearchParams, multiFilters],
  );

  const onRemove = useCallback(
    (key: string, value: any) => {
      if (
        Object.keys(multiFilters).includes(key) &&
        !(multiFilters[key].length === 1 && multiFilters[key][0] === value)
      ) {
        updateSearchParams({
          set: {
            [key]: multiFilters[key].filter((id) => id !== value).join(","),
          },
          del: "page",
        });
      } else {
        updateSearchParams({
          del: [key, "page"],
        });
      }
    },
    [updateSearchParams, multiFilters],
  );

  const onRemoveAll = useCallback(
    () =>
      updateSearchParams({
        del: ["country", "starred", "platform", "reach"],
      }),
    [updateSearchParams],
  );

  const isFiltered =
    activeFilters.length > 0 ||
    !!searchParamsObj.platform ||
    !!searchParamsObj.reach ||
    !!searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
