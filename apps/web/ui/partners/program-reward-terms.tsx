import { currencyFormatter } from "@dub/utils";

export function ProgramRewardTerms({
  minPayoutAmount,
  holdingPeriodDays,
}: {
  minPayoutAmount: number;
  holdingPeriodDays: number;
}) {
  const items = [
    ...(minPayoutAmount > 0
      ? [
          {
            label: "minimum payout amount",
            value: currencyFormatter(minPayoutAmount, {
              trailingZeroDisplay: "stripIfInteger",
            }),
            href: "https://dub.co/help/article/commissions-payouts#what-does-minimum-payout-amount-mean",
          },
        ]
      : []),
    ...(holdingPeriodDays > 0
      ? [
          {
            label: "holding period",
            value: `${holdingPeriodDays}-day`,
            href: "https://dub.co/help/article/commissions-payouts#what-does-holding-period-mean",
          },
        ]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <div className="border-border-subtle text-content-subtle -mt-1 flex items-center rounded-b-md rounded-t-none border border-t-0 p-1.5 pl-2.5 pt-2.5 text-xs">
      {items.map((item, index) => (
        <span key={item.label}>
          <span className="text-content-emphasis font-semibold">
            {item.value}
          </span>{" "}
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            {item.label}
          </a>
          {index < items.length - 1 && ", "}
        </span>
      ))}
    </div>
  );
}
