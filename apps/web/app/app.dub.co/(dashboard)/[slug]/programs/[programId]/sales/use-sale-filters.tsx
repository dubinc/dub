import useSalesCount from "@/lib/swr/use-sales-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { CircleDotted, useRouterStuff } from "@dub/ui";
import { MoneyBill2, Users } from "@dub/ui/src/icons";
import { cn, DICEBEAR_AVATAR_URL, fetcher, nFormatter } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { SaleStatusBadges } from "./sale-table";

export function useSaleFilters() {
  const { programId } = useParams();
  const { salesCount } = useSalesCount();
  const { id: workspaceId } = useWorkspace();
  const { searchParamsObj, queryParams } = useRouterStuff();

  const { data: partners } = useSWR<EnrolledPartnerProps[]>(
    `/api/programs/${programId}/partners?workspaceId=${workspaceId}`,
    fetcher,
  );

  const filters = useMemo(
    () => [
      {
        key: "partnerId",
        icon: Users,
        label: "Partner",
        options: (partners || []).map(({ id, name, logo }) => {
          return {
            value: id,
            label: name,
            icon: (
              <img
                src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
                alt={`${name} avatar`}
                className="size-4 rounded-full"
              />
            ),
          };
        }),
      },
      {
        key: "payoutId",
        icon: MoneyBill2,
        label: "Payout",
        options: [],
      },
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: Object.entries(SaleStatusBadges).map(([value, { label }]) => {
          const Icon = SaleStatusBadges[value].icon;
          return {
            value,
            label,
            icon: (
              <Icon
                className={cn(
                  SaleStatusBadges[value].className,
                  "size-4 bg-transparent",
                )}
              />
            ),
            right: nFormatter(salesCount?.[value] || 0, { full: true }),
          };
        }),
      },
    ],
    [salesCount, partners],
  );

  const activeFilters = useMemo(() => {
    const { status, partnerId, payoutId } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(partnerId ? [{ key: "partnerId", value: partnerId }] : []),
      ...(payoutId ? [{ key: "payoutId", value: payoutId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "partnerId", "payoutId"],
    });

  const isFiltered = activeFilters.length > 0 || searchParamsObj.search;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
