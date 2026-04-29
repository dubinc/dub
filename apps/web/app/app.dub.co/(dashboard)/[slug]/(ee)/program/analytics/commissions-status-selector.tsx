"use client";

import { CommissionsCount } from "@/lib/types";
import { ToggleGroup, useMediaQuery, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ChevronRight } from "lucide-react";
import useSWR from "swr";
export type CommissionStatusFilter =
  | "pending"
  | "processed"
  | "paid"
  | undefined;

const STATUS_TABS: {
  id: CommissionStatusFilter;
  label: string;
  colorClassName: string;
}[] = [
  {
    id: undefined,
    label: "All",
    colorClassName: "text-neutral-400/70",
  },
  {
    id: "pending",
    label: "Pending",
    colorClassName: "text-orange-400/50",
  },
  {
    id: "processed",
    label: "Processed",
    colorClassName: "text-blue-500/50",
  },
  {
    id: "paid",
    label: "Paid",
    colorClassName: "text-green-500/50",
  },
];

export function CommissionsStatusSelector({
  status,
  queryString,
}: {
  status: CommissionStatusFilter;
  queryString: string;
}) {
  const { queryParams, searchParamsObj } = useRouterStuff();
  const unit =
    searchParamsObj.commissionUnit === "count" ? "count" : "earnings";

  const countQueryString = (() => {
    if (!queryString) return null;
    const params = new URLSearchParams(queryString);
    params.delete("status");
    return params.toString();
  })();

  const { data: commissionsCount } = useSWR<CommissionsCount>(
    countQueryString ? `/api/commissions/count?${countQueryString}` : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { isMobile } = useMediaQuery();

  return (
    <div className="grid w-full grid-cols-4 divide-x divide-neutral-200 overflow-y-hidden">
      <NumberFlowGroup>
        {STATUS_TABS.map(({ id, label, colorClassName }, idx) => {
          const key = id ?? "all";
          const earnings = commissionsCount?.[key]?.earnings ?? 0;
          const count = commissionsCount?.[key]?.count ?? 0;
          const isActive = id === status;
          const isLast = idx === STATUS_TABS.length - 1;

          return (
            <div key={label} className="relative z-0">
              {idx > 0 && (
                <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                  <ChevronRight
                    className="h-3 w-3 text-neutral-400"
                    strokeWidth={2.5}
                  />
                </div>
              )}
              <button
                className="border-box relative block h-full w-full min-w-[80px] flex-none px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100 sm:min-w-[180px] sm:px-8 sm:py-6"
                onClick={() =>
                  id === undefined
                    ? queryParams({ del: "status", scroll: false })
                    : queryParams({ set: { status: id }, scroll: false })
                }
              >
                <div
                  className={[
                    "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                    !isActive ? "translate-y-[3px]" : "",
                  ].join(" ")}
                />
                <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                  <div
                    className={[
                      "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                      colorClassName,
                    ].join(" ")}
                  />
                  <span>{label}</span>
                </div>
                <div className="mt-1 flex h-12 items-center">
                  {commissionsCount ? (
                    <NumberFlow
                      value={unit === "earnings" ? earnings / 100 : count}
                      className="text-xl font-medium sm:text-2xl"
                      format={
                        unit === "earnings"
                          ? {
                              ...(isMobile && {
                                notation: "compact",
                              }),
                              style: "currency",
                              currency: "USD",
                              // @ts-ignore – trailingZeroDisplay is valid
                              trailingZeroDisplay: "stripIfInteger",
                            }
                          : {
                              notation:
                                isMobile || count > 999999
                                  ? "compact"
                                  : "standard",
                            }
                      }
                    />
                  ) : (
                    <div className="h-9 w-24 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </div>
              </button>

              {isLast && (
                <ToggleGroup
                  className="absolute right-3 top-3 hidden w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100 sm:flex"
                  optionClassName="size-8 p-0 flex items-center justify-center"
                  indicatorClassName="border border-neutral-200 bg-white"
                  options={[
                    {
                      label: <div className="text-base">$</div>,
                      value: "earnings",
                    },
                    {
                      label: <div className="text-[11px]">123</div>,
                      value: "count",
                    },
                  ]}
                  selected={unit}
                  selectAction={(v) =>
                    queryParams({ set: { commissionUnit: v }, scroll: false })
                  }
                />
              )}
            </div>
          );
        })}
      </NumberFlowGroup>
    </div>
  );
}
