import { EnrolledPartnerProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";

export function PartnerInfoStats({
  partner,
  className,
}: {
  partner: EnrolledPartnerProps;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "xs:grid-cols-3 grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        className,
      )}
    >
      {[
        [
          "Clicks",
          Number.isNaN(partner.totalClicks)
            ? "-"
            : nFormatter(partner.totalClicks, { full: true }),
        ],
        [
          "Leads",
          Number.isNaN(partner.totalLeads)
            ? "-"
            : nFormatter(partner.totalLeads, { full: true }),
        ],
        [
          "Conversions",
          Number.isNaN(partner.totalConversions)
            ? "-"
            : nFormatter(partner.totalConversions, { full: true }),
        ],
        [
          "Revenue",
          Number.isNaN(partner.totalSaleAmount)
            ? "-"
            : currencyFormatter(partner.totalSaleAmount / 100, {
                trailingZeroDisplay: "stripIfInteger",
              }),
        ],
        [
          "Commissions",
          Number.isNaN(partner.totalCommissions)
            ? "-"
            : currencyFormatter(partner.totalCommissions / 100),
        ],
        [
          "Net revenue",
          Number.isNaN(partner.netRevenue)
            ? "-"
            : currencyFormatter(partner.netRevenue / 100),
        ],
      ].map(([label, value]) => (
        <div key={label} className="flex flex-col bg-neutral-50 p-3">
          <span className="text-xs text-neutral-500">{label}</span>
          <span className="text-base text-neutral-900">{value}</span>
        </div>
      ))}
    </div>
  );
}
