"use client";

import { useRouterStuff } from "@dub/ui";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { ChevronRight } from "lucide-react";
import {
  CommissionStatusFilter,
  MOCK_COMMISSION_TOTALS,
} from "./commissions-mock-data";

export type { CommissionStatusFilter };

const STATUS_TABS: {
  id: CommissionStatusFilter;
  label: string;
  colorClassName: string;
}[] = [
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
}: {
  status: CommissionStatusFilter;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <div className="grid w-full grid-cols-3 divide-x divide-neutral-200 overflow-y-hidden">
      <NumberFlowGroup>
        {STATUS_TABS.map(({ id, label, colorClassName }, idx) => (
          <div key={id} className="relative z-0">
            {idx > 0 && (
              <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                <ChevronRight
                  className="h-3 w-3 text-neutral-400"
                  strokeWidth={2.5}
                />
              </div>
            )}
            <button
              className="border-box relative block h-full w-full min-w-[110px] flex-none px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100 sm:min-w-[240px] sm:px-8 sm:py-6"
              onClick={() =>
                queryParams({ set: { commissionStatus: id }, scroll: false })
              }
            >
              <div
                className={[
                  "absolute bottom-0 left-0 h-0.5 w-full bg-black transition-transform duration-100",
                  status !== id ? "translate-y-[3px]" : "",
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
                <NumberFlow
                  value={MOCK_COMMISSION_TOTALS[id] / 100}
                  className="text-xl font-medium sm:text-3xl"
                  format={{
                    style: "currency",
                    currency: "USD",
                    // @ts-ignore
                    trailingZeroDisplay: "stripIfInteger",
                  }}
                />
              </div>
            </button>
          </div>
        ))}
      </NumberFlowGroup>
    </div>
  );
}
