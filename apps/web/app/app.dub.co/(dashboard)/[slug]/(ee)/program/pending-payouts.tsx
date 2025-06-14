import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutResponse } from "@/lib/types";
import { buttonVariants } from "@dub/ui";
import { cn, currencyFormatter, fetcher, OG_AVATAR_URL } from "@dub/utils";
import { usePayoutDetailsSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/payouts/payout-details-sheet";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

export function PendingPayouts() {
  const { slug } = useParams();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { data: payouts, error } = useSWR<PayoutResponse[]>(
    workspaceId &&
      defaultProgramId &&
      `/api/programs/${defaultProgramId}/payouts?${new URLSearchParams({
        workspaceId: workspaceId!,
        status: "pending",
        sortBy: "amount",
        pageSize: "5",
      }).toString()}`,
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
          href={`/${slug}/program/payouts?status=pending&sortBy=amount`}
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

function PayoutRow({ payout }: { payout: PayoutResponse }) {
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
              payout.partner.image || `${OG_AVATAR_URL}${payout.partner.name}`
            }
            alt={payout.partner.name}
            className="size-8 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-neutral-800">{payout.partner.name}</span>
            <span className="text-neutral-500">
              {payout.partner.email ?? "-"}
            </span>
          </div>
        </div>
        <span className="text-sm text-neutral-500">
          {currencyFormatter(payout.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </button>
    </>
  );
}
