import useGroups from "@/lib/swr/use-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import {
  CircleCheck,
  CircleHalfDottedCheck,
  CircleXmark,
  Users6,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useCallback, useMemo } from "react";
import { BOUNTY_SUBMISSION_STATUS_BADGES } from "./bounty-submissions-table";

const statusIcons = {
  pending: {
    icon: CircleHalfDottedCheck,
    className: "text-orange-600",
  },
  approved: {
    icon: CircleCheck,
    className: "text-green-600",
  },
  rejected: {
    icon: CircleXmark,
    className: "text-red-600",
  },
};

export function useBountySubmissionFilters() {
  const { slug } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { groups } = useGroups();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(BOUNTY_SUBMISSION_STATUS_BADGES).map(
          ([value, { label }]) => {
            const { icon: Icon, className } = statusIcons[value];

            return {
              value,
              label,
              icon: <Icon className={cn("size-4 bg-transparent", className)} />,
            };
          },
        ),
      },
      {
        key: "groupId",
        icon: Users6,
        label: "Partner Group",
        options:
          groups?.map((group) => {
            return {
              value: group.id,
              label: group.name,
              icon: <GroupColorCircle group={group} />,
              permalink: `/${slug}/program/groups/${group.slug}/rewards`,
            };
          }) ?? null,
      },
    ],
    [groups],
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
