import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { PayoutsCount } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { useRouterStuff } from "@dub/ui";
import { CircleDotted, GridIcon } from "@dub/ui/icons";
import { cn, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useMemo } from "react";

export function usePayoutFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { payoutsCount } = usePartnerPayoutsCount<PayoutsCount[]>({
    groupBy: "status",
  });

  const { programEnrollments } = useProgramEnrollments();

  const filters = useMemo(
    () => [
      {
        key: "programId",
        icon: GridIcon,
        label: "Program",
        options:
          programEnrollments?.map(({ program }) => {
            return {
              value: program.id,
              label: program.name,
              icon: (
                <img
                  src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                  alt={`${program.name} image`}
                  className="size-4 rounded-full"
                />
              ),
            };
          }) ?? null,
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(PayoutStatusBadges).map(
          ([value, { label }]) => {
            const Icon = PayoutStatusBadges[value].icon;
            const count = payoutsCount?.find((p) => p.status === value)?.count;

            return {
              value,
              label,
              icon: (
                <Icon
                  className={cn(
                    PayoutStatusBadges[value].className,
                    "size-4 bg-transparent",
                  )}
                />
              ),
              right: nFormatter(count || 0, { full: true }),
            };
          },
        ),
      },
    ],
    [payoutsCount, programEnrollments],
  );

  const activeFilters = useMemo(() => {
    const { programId, status } = searchParamsObj;
    return [
      ...(programId ? [{ key: "programId", value: programId }] : []),
      ...(status ? [{ key: "status", value: status }] : []),
    ];
  }, [searchParamsObj.status, searchParamsObj.programId]);

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
        del: ["status", "programId"],
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
  };
}
