import { EnrolledPartnerProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";

const stats: {
  label: string;
  value: (partner: EnrolledPartnerProps) => string;
}[] = [
  {
    label: "Clicks",
    value: (partner) =>
      Number.isNaN(partner.clicks)
        ? "-"
        : nFormatter(partner.clicks, { full: true }),
  },
  {
    label: "Leads",
    value: (partner) =>
      Number.isNaN(partner.leads)
        ? "-"
        : nFormatter(partner.leads, { full: true }),
  },
  {
    label: "Conversions",
    value: (partner) =>
      Number.isNaN(partner.conversions)
        ? "-"
        : nFormatter(partner.conversions, { full: true }),
  },
  {
    label: "Revenue",
    value: (partner) =>
      Number.isNaN(partner.saleAmount)
        ? "-"
        : currencyFormatter((partner.saleAmount ?? 0) / 100, {
            trailingZeroDisplay: "stripIfInteger",
          }),
  },
  {
    label: "Commissions",
    value: (partner) =>
      Number.isNaN(partner.totalCommissions)
        ? "-"
        : currencyFormatter((partner.totalCommissions ?? 0) / 100),
  },
  {
    label: "Net revenue",
    value: (partner) =>
      Number.isNaN(partner.netRevenue)
        ? "-"
        : currencyFormatter((partner.netRevenue ?? 0) / 100),
  },
];

export function PartnerStats({
  partner,
  error,
}: {
  partner?: EnrolledPartnerProps;
  error?: boolean;
}) {
  return (
    <div className="@container/stats">
      <div
        className={cn(
          "@[695px]/stats:grid-cols-6 @xs/stats:grid-cols-3 grid grid-cols-2 ring-4 ring-black/5",
          "gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        )}
      >
        {stats.map(({ label, value: valueFn }) => {
          const value = partner ? valueFn(partner) : error ? "-" : undefined;
          return (
            <div key={label} className="flex flex-col bg-white p-3">
              <span className="text-xs text-neutral-500">{label}</span>
              {value === undefined ? (
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <span className="text-content-emphasis text-sm font-medium">
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
