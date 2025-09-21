import {
  SubmissionsCountByStatus,
  useBountySubmissionsCount,
} from "@/lib/swr/use-bounty-submissions-count";
import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyExtendedProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import { useCallback, useMemo } from "react";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submission-status-badges";

export function useBountySubmissionFilters({
  bounty,
}: {
  bounty?: BountyExtendedProps;
}) {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { slug } = useWorkspace();
  const { groups } = useGroups();

  const { submissionsCount } =
    useBountySubmissionsCount<SubmissionsCountByStatus[]>();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: submissionsCount
          ? submissionsCount.map(({ status, count }) => {
              {
                const {
                  label,
                  icon: Icon,
                  iconClassName,
                } = BOUNTY_SUBMISSION_STATUS_BADGES[status];
                return {
                  value: status,
                  label,
                  icon: (
                    <Icon
                      className={cn("size-4 bg-transparent", iconClassName)}
                    />
                  ),
                  right: nFormatter(count, {
                    full: true,
                  }),
                };
              }
            })
          : null,
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Partner Group",
        options:
          groups // only show groups that are associated with the bounty
            ?.filter((group) =>
              bounty?.groups && bounty?.groups.length > 0
                ? bounty?.groups.map((g) => g.id).includes(group.id)
                : true,
            )
            .map((group) => {
              return {
                value: group.id,
                label: group.name,
                icon: <GroupColorCircle group={group} />,
                permalink: `/${slug}/program/groups/${group.slug}/rewards`,
              };
            }) ?? null,
      },
    ],
    [bounty, submissionsCount, groups, slug],
  );

  const activeFilters = useMemo(() => {
    const { status, groupId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(groupId ? [{ key: "groupId", value: groupId }] : []),
    ];
  }, [searchParamsObj.status, searchParamsObj.groupId]);

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
        del: ["status", "groupId"],
      }),
    [queryParams],
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
    isFiltered,
  };
}
