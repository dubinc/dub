import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { CountryFlag } from "@/ui/shared/country-flag";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Globe } from "@dub/ui/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { useReferredPartnersCount } from "./use-referred-partners-count";

export function useReferredPartnerFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: countriesCount } = useReferredPartnersCount<
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

  const { data: statusesCount } = useReferredPartnersCount<
    | {
        status: ProgramEnrollmentStatus;
        _count: number;
      }[]
    | undefined
  >({
    query: {
      groupBy: "status",
    },
    enabled: selectedFilter === "status" || !!searchParamsObj.status,
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
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusesCount?.map(({ status, _count }) => {
            const {
              label,
              icon: Icon,
              className,
            } = PartnerStatusBadges[status];

            return {
              value: status,
              label,
              icon: <Icon className={cn(className, "size-4 bg-transparent")} />,
              right: nFormatter(_count, { full: true }),
            };
          }) ?? null,
      },
    ],
    [countriesCount, statusesCount],
  );

  const activeFilters = useMemo(() => {
    const { country, status } = searchParamsObj;
    return [
      ...(country ? [{ key: "country", value: country }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
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
        del: ["country", "status", "page"],
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
