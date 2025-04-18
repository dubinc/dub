import { Button, InfoTooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function ReferralsEmbedEarningsSummary({
  earnings,
  programSlug,
}: {
  earnings: { upcoming: number; paid: number };
  programSlug: string;
}) {
  return (
    <div className="border-border-subtle bg-bg-default flex flex-col justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="text-content-subtle text-sm">Earnings</p>
          <InfoTooltip content="Summary of your commission earnings from your referrals." />
        </div>
        <a
          href={`https://partners.dub.co/${programSlug}/register`}
          target="_blank"
        >
          <Button
            text="Settings"
            variant="secondary"
            className="h-7 p-2 text-sm"
          />
        </a>
      </div>
      <div className="grid gap-1">
        {[
          {
            label: "Upcoming",
            value: earnings.upcoming,
          },
          {
            label: "Paid",
            value: earnings.paid,
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-content-subtle font-medium">{label}</span>
            <span className="text-content-default font-semibold">
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
