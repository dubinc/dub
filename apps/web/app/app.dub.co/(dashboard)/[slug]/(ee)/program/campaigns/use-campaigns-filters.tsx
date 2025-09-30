import useWorkspace from "@/lib/swr/use-workspace";
import { CampaignStatus, CampaignType } from "@dub/prisma/client";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, Sliders } from "@dub/ui/icons";
import { nFormatter } from "@dub/utils";
import { useMemo } from "react";
import { CampaignStatusBadges } from "./campaign-status-badges";
import { CampaignTypeBadges } from "./campaign-type-badges";
import useCampaignsCount from "./use-campaigns-count";

interface CampaignsCountByType {
  type: CampaignType;
  _count: number;
}

interface CampaignsCountByStatus {
  status: CampaignStatus;
  _count: number;
}

export function useCampaignsFilters() {
  const { id: workspaceId } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { campaignsCount: countByType } = useCampaignsCount<
    CampaignsCountByType[] | undefined
  >({
    groupBy: "type",
  });

  const { campaignsCount: countByStatus } = useCampaignsCount<
    CampaignsCountByStatus[] | undefined
  >({
    groupBy: "status",
  });

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          countByStatus?.map(({ status, _count }) => {
            const {
              label,
              icon: Icon,
              iconClassName,
            } = CampaignStatusBadges[status];

            return {
              label,
              value: status,
              icon: <Icon className={iconClassName} />,
              right: nFormatter(_count || 0, { full: true }),
            };
          }) ?? [],
      },
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options:
          countByType?.map(({ type, _count }) => {
            const {
              label,
              icon: Icon,
              iconClassName,
            } = CampaignTypeBadges[type];

            return {
              label,
              value: type,
              icon: <Icon className={iconClassName} />,
              right: nFormatter(_count || 0, { full: true }),
            };
          }) ?? [],
      },
    ],
    [countByType, countByStatus],
  );

  const activeFilters = useMemo(() => {
    const { status, type } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(type ? [{ key: "type", value: type }] : []),
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
      del: ["status", "type", "search"],
    });

  const searchQuery = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(
          activeFilters.map(({ key, value }) => [key, value]),
        ),
        ...(searchParamsObj.search && { search: searchParamsObj.search }),
        workspaceId: workspaceId || "",
      }).toString(),
    [activeFilters, workspaceId],
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
