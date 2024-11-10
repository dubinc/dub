import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutWithPartnerProps } from "@/lib/types";
import { usePayoutDetailsSheet } from "@/ui/partners/payout-details-sheet";
import { buttonVariants } from "@dub/ui";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PendingPayouts() {
  const { slug, programId } = useParams();
  const { id: workspaceId } = useWorkspace();

  const { data: payouts, error } = useSWR<PayoutWithPartnerProps[]>(
    `/api/programs/${programId}/payouts?workspaceId=${workspaceId}&status=pending&sortBy=periodStart&order=desc&pageSize=5`,
    fetcher,
  );

  const isLoading = !payouts && !error;

  return (
    <div className="rounded-md border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 p-5">
        <h2 className="text-base font-semibold text-neutral-900">
          Pending payouts
        </h2>

        <Link
          href={`/${slug}/programs/${programId}/payouts?status=pending`}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-7 items-center rounded-lg border px-2 text-sm",
          )}
        >
          View all
        </Link>
      </div>
      <div className="p-3">
        <div className="h-px min-h-64">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex h-12 items-center justify-between p-2"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
                    <div className="flex flex-col gap-0.5">
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                      <div className="h-3.5 w-16 animate-pulse rounded bg-neutral-200" />
                    </div>
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded bg-neutral-200" />
                </div>
              ))}
            </div>
          ) : payouts?.length ? (
            <div className="grid grid-cols-1 gap-1">
              {payouts.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} />
              ))}
            </div>
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-neutral-500">
              No pending payouts found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PayoutRow({ payout }: { payout: PayoutWithPartnerProps }) {
  const { payoutDetailsSheet, setIsOpen: setShowPayoutDetailsSheet } =
    usePayoutDetailsSheet({
      payout,
    });

  return (
    <>
      {payoutDetailsSheet}
      <button
        key={payout.id}
        type="button"
        className="flex h-12 items-center justify-between rounded-md p-2 text-left transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
        onClick={() => setShowPayoutDetailsSheet(true)}
      >
        <div className="flex items-center gap-2 text-xs">
          <img
            src={
              payout.partner.logo ||
              `${DICEBEAR_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="size-8 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-neutral-800">{payout.partner.name}</span>
            <span className="text-neutral-500">
              {COUNTRIES[payout.partner.country ?? ""] ?? "-"}
            </span>
          </div>
        </div>
        <span className="text-sm text-neutral-500">
          {currencyFormatter(payout.total / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </button>
    </>
  );
}
