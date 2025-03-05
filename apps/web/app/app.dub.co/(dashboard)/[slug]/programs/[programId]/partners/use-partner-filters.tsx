import usePartnersCount from "@/lib/swr/use-partners-count";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { REWARD_EVENTS } from "@/lib/zod/schemas/rewards";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { formatRewardDescription } from "@/ui/partners/program-reward-description";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, FlagWavy, Gift } from "@dub/ui/icons";
import { cn, COUNTRIES, nFormatter } from "@dub/utils";
import { useMemo } from "react";

export function usePartnerFilters(extraSearchParams: Record<string, string>) {
  const { searchParamsObj, queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();
  const { rewards } = useRewards();

  const { partnersCount: countriesCount } = usePartnersCount<
    {
      country: string;
      _count: number;
    }[]
  >({
    groupBy: "country",
  });

  const { partnersCount: statusCount } = usePartnersCount<
    {
      status: string;
      _count: number;
    }[]
  >({
    groupBy: "status",
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
          countriesCount?.map(({ country, _count }) => ({
            value: country,
            label: COUNTRIES[country],
            right: nFormatter(_count, { full: true }),
          })) ?? [],
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(PartnerStatusBadges).map(
          ([value, { label }]) => {
            const Icon = PartnerStatusBadges[value].icon;
            const count = statusCount?.find(
              ({ status }) => status === value,
            )?._count;

            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    PartnerStatusBadges[value].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(count || 0, { full: true }),
            };
          },
        ),
      },
      {
        key: "rewardId",
        icon: Gift,
        label: "Reward",
        getOptionIcon: (rewardId: string) => {
          const reward = rewards?.find((reward) => reward.id === rewardId);

          if (!reward) {
            return null;
          }

          const Icon = REWARD_EVENTS[reward.event].icon;

          return <Icon className="size-4 bg-transparent" />;
        },
        getOptionLabel: (rewardId: string) => {
          const reward = rewards?.find((reward) => reward.id === rewardId);

          if (!reward) {
            return null;
          }

          return formatRewardDescription({ reward });
        },
        options:
          rewards
            ?.filter(
              (reward) => reward.partnersCount && reward.partnersCount > 0,
            )
            .map((reward) => {
              const Icon = REWARD_EVENTS[reward.event].icon;

              return {
                value: reward.id,
                label: formatRewardDescription({ reward }),
                icon: <Icon className="size-4 bg-transparent" />,
                // right: reward.event,
              };
            }) ?? [],
      },
    ],
    [countriesCount, statusCount, rewards],
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
