"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerPayoutResponse } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { CircleWarning, MoneyBills2, StatusBadge } from "@dub/ui";
import { currencyFormatter, fetcher, formatDate } from "@dub/utils";
import Link from "next/link";
import useSWR from "swr";

export function PayoutsCard({ programId }: { programId?: string }) {
  const { partner } = usePartnerProfile();

  const { data: payouts, error } = useSWR<PartnerPayoutResponse[]>(
    partner && programId
      ? `/api/partner-profile/payouts?${new URLSearchParams({
          programId,
          pageSize: "4",
        })}`
      : undefined,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-300 p-5 pb-3">
      <div className="flex justify-between">
        <span className="block text-base font-semibold leading-none text-neutral-800">
          Payouts
        </span>
        {Boolean(payouts?.length) && (
          <Link
            href={`/settings/payouts`}
            className="text-sm font-medium leading-none text-neutral-500 hover:text-neutral-600"
          >
            View all
          </Link>
        )}
      </div>
      {payouts ? (
        payouts.length ? (
          <div className="flex flex-col divide-y divide-neutral-200">
            {payouts?.map((payout) => {
              const badge = PayoutStatusBadges[payout.status];
              return (
                <div
                  key={payout.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-neutral-800">
                      {currencyFormatter(payout.amount / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[0.625rem] text-neutral-500">
                      {formatDate(payout.createdAt)}
                    </span>
                  </div>
                  <span>
                    <StatusBadge variant={badge.variant} className="">
                      {badge.label}
                    </StatusBadge>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty state
          <div className="flex grow flex-col items-center justify-center gap-2 p-4 text-xs text-neutral-600">
            <MoneyBills2 className="size-4" />
            No payouts
          </div>
        )
      ) : error ? (
        // Error state
        <div className="flex grow flex-col items-center justify-center gap-2 p-4 text-xs text-neutral-600">
          <CircleWarning className="size-4" />
          Failed to load payouts
        </div>
      ) : (
        // Loading state
        <div className="flex flex-col divide-y divide-neutral-200">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="my-1 h-[39px] w-full animate-pulse rounded-md bg-neutral-200"
            />
          ))}
        </div>
      )}
    </div>
  );
}
