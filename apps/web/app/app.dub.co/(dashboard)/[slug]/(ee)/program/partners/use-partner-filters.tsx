import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { RewardProps } from "@/lib/types";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy, Gift } from "@dub/ui/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { useMemo } from "react";

export function usePartnerFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const { partnersCount: countriesCount } = usePartnersCount<
    | {
        country: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "country",
  });

  const { partnersCount: statusCount } = usePartnersCount<
    | {
        status: string;
        _count: number;
      }[]
    | undefined
  >({
    groupBy: "status",
  });

  const { partnersCount: rewardsCount } = usePartnersCount<
    | (RewardProps & {
        partnersCount: number;
      })[]
    | undefined
  >({
    groupBy: "rewardId",
  });

  const filters = useMemo(
    () => [
      {
        key: "country",
        icon: FlagWavy,
        label: "Location",
        getOptionIcon: (value) => (
          <img
            alt={value}
            src={`https://flag.vercel.app/m/${value}.svg`}
            className="h-2.5 w-4"
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
            })) ?? [],
      },
      {
        key: "rewardId",
        icon: Gift,
        label: "Reward",
        options:
          rewardsCount?.map((reward) => {
            const Icon = REWARD_EVENTS[reward.event].icon;
            return {
              value: reward.id,
              label: reward.name || formatRewardDescription({ reward }),
              icon: <Icon className="size-4 bg-transparent" />,
              right: nFormatter(reward.partnersCount, { full: true }),
            };
          }) ?? [],
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount?.map(({ status, _count }) => {
            const Icon = PartnerStatusBadges[status].icon;
            return {
              value: status,
              label: PartnerStatusBadges[status].label,
              icon: (
                <Icon
                  className={cn(
                    PartnerStatusBadges[status].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(_count || 0, { full: true }),
            };
          }) ?? [],
      },
    ],
    [countriesCount, statusCount, rewardsCount],
  );

  const activeFilters = useMemo(() => {
    const { status, country, rewardId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(rewardId ? [{ key: "rewardId", value: rewardId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "country", "rewardId", "search"],
    });

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

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    searchQuery,
    isFiltered,
  };
}
