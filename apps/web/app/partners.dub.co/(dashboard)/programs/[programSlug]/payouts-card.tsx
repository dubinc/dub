"use client";

import usePartnerPayouts from "@/lib/swr/use-partner-payouts";
import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import { PartnerPayoutResponse } from "@/lib/types";
import { PayoutStatusBadges } from "@/ui/partners/payout-status-badges";
import { CircleWarning, MoneyBills2, StatusBadge } from "@dub/ui";
import { currencyFormatter, formatDate } from "@dub/utils";
import Link from "next/link";
import { useState } from "react";
import { PayoutDetailsSheet } from "../../settings/payouts/payout-details-sheet";

export function PayoutsCard({ programId }: { programId?: string }) {
  const { payouts, error } = usePartnerPayouts({
    ...(programId && { programId }),
    pageSize: "4",
  });
  const { payoutsCount } = usePartnerPayoutsCount<number>({
    ...(programId && { programId }),
  });

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; payout: PartnerPayoutResponse | null }
    | { open: true; payout: PartnerPayoutResponse }
  >({ open: false, payout: null });

  return (
    <>
      {detailsSheetState.payout && (
        <PayoutDetailsSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          payout={detailsSheetState.payout}
        />
      )}
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-300 p-5 pb-3">
        <div className="flex justify-between">
          <span className="block text-base font-semibold leading-none text-neutral-800">
            Payouts
          </span>
          {payouts?.length ? (
            <Link
              href={`/settings/payouts?programId=${programId}`}
              className="text-sm font-medium leading-none text-neutral-500 hover:text-neutral-600"
            >
              {payouts.length} of {payoutsCount} results
            </Link>
          ) : null}
        </div>
        {payouts ? (
          payouts.length ? (
            <div className="-mx-2 flex flex-col divide-y divide-neutral-200">
              {payouts?.map((payout) => {
                const badge = PayoutStatusBadges[payout.status];
                return (
                  <button
                    key={payout.id}
                    type="button"
                    onClick={() => setDetailsSheetState({ open: true, payout })}
                    className="flex items-center justify-between p-2 text-left transition-colors duration-100 hover:bg-neutral-50 active:bg-neutral-100"
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
                  </button>
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
    </>
  );
}
