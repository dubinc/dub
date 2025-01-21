import { PayoutStatus } from "@dub/prisma/client";
import { InfoTooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function EmbedPayouts({
  payouts,
}: {
  payouts: { status: PayoutStatus; amount: number }[];
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1">
        <p className="text-sm text-neutral-500">Payouts</p>
        <InfoTooltip content="Payouts are processed at the start of each month. Your earnings are automatically transferred to your bank account." />
      </div>
      <div className="grid gap-1">
        {[
          {
            label: "Upcoming",
            value:
              payouts.find((payout) => payout.status === PayoutStatus.pending)
                ?.amount ?? 0,
          },
          {
            label: "Paid",
            value:
              payouts.find((payout) => payout.status === PayoutStatus.completed)
                ?.amount ?? 0,
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="font-medium text-neutral-500">{label}</span>
            <span className="font-semibold text-neutral-700">
              {currencyFormatter(value / 100, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
