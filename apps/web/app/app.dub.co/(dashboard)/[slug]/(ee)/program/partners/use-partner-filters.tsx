import usePartnersCount from "@/lib/swr/use-partners-count";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { RewardProps } from "@/lib/types";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { useRouterStuff } from "@dub/ui";
import {
  CircleDotted,
  CursorRays,
  FlagWavy,
  InvoiceDollar,
  UserPlus,
} from "@dub/ui/icons";
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

  const { rewards } = useRewards();

  const { hasClickRewards, hasLeadRewards, hasSaleRewards } = useMemo(() => {
    return {
      hasClickRewards: rewards?.some((r) => r.event === "click") ?? false,
      hasLeadRewards: rewards?.some((r) => r.event === "lead") ?? false,
      hasSaleRewards: rewards?.some((r) => r.event === "sale") ?? false,
    };
  }, [rewards]);

  const { partnersCount: clickRewardsCount } = usePartnersCount<
    | (RewardProps & {
        partnersCount: number;
      })[]
    | undefined
  >({
    groupBy: "clickRewardId",
    enabled: hasClickRewards,
  });

  const { partnersCount: leadRewardsCount } = usePartnersCount<
    | (RewardProps & {
        partnersCount: number;
      })[]
    | undefined
  >({
    groupBy: "leadRewardId",
    enabled: hasLeadRewards,
  });

  const { partnersCount: saleRewardsCount } = usePartnersCount<
    | (RewardProps & {
        partnersCount: number;
      })[]
    | undefined
  >({
    groupBy: "saleRewardId",
    enabled: hasSaleRewards,
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
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          statusCount
            ?.filter(({ status }) => !["pending", "rejected"].includes(status))
            ?.map(({ status, _count }) => {
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

      ...(saleRewardsCount && saleRewardsCount.length > 0
        ? [
            {
              key: "saleRewardId",
              icon: InvoiceDollar,
              label: "Sale reward",
              options:
                saleRewardsCount?.map((reward) => {
                  return {
                    value: reward.id,
                    label: reward.name || formatRewardDescription({ reward }),
                    icon: <InvoiceDollar className="size-4 bg-transparent" />,
                    right: nFormatter(reward.partnersCount, { full: true }),
                  };
                }) ?? [],
            },
          ]
        : []),

      ...(leadRewardsCount && leadRewardsCount.length > 0
        ? [
            {
              key: "leadRewardId",
              icon: UserPlus,
              label: "Lead reward",
              options:
                leadRewardsCount?.map((reward) => {
                  return {
                    value: reward.id,
                    label: reward.name || formatRewardDescription({ reward }),
                    icon: <UserPlus className="size-4 bg-transparent" />,
                    right: nFormatter(reward.partnersCount, { full: true }),
                  };
                }) ?? [],
            },
          ]
        : []),

      ...(clickRewardsCount && clickRewardsCount.length > 0
        ? [
            {
              key: "clickRewardId",
              icon: CursorRays,
              label: "Click reward",
              options:
                clickRewardsCount?.map((reward) => {
                  return {
                    value: reward.id,
                    label: reward.name || formatRewardDescription({ reward }),
                    icon: <CursorRays className="size-4 bg-transparent" />,
                    right: nFormatter(reward.partnersCount, { full: true }),
                  };
                }) ?? [],
            },
          ]
        : []),
    ],
    [
      countriesCount,
      statusCount,
      clickRewardsCount,
      leadRewardsCount,
      saleRewardsCount,
    ],
  );

  const activeFilters = useMemo(() => {
    const { status, country, clickRewardId, leadRewardId, saleRewardId } =
      searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(country ? [{ key: "country", value: country }] : []),
      ...(clickRewardId
        ? [{ key: "clickRewardId", value: clickRewardId }]
        : []),
      ...(leadRewardId ? [{ key: "leadRewardId", value: leadRewardId }] : []),
      ...(saleRewardId ? [{ key: "saleRewardId", value: saleRewardId }] : []),
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
      del: [
        "status",
        "country",
        "clickRewardId",
        "leadRewardId",
        "saleRewardId",
        "search",
      ],
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
