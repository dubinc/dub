import { EnrolledPartnerProps } from "@/lib/types";
import { currencyFormatter, nFormatter } from "@dub/utils";
import { cn } from "@dub/utils/src";

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
        "xs:grid-cols-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        className,
      )}
    >
      {[
        [
          "Clicks",
          !partner.clicks ? "-" : nFormatter(partner.clicks, { full: true }),
        ],
        [
          "Leads",
          !partner.leads ? "-" : nFormatter(partner.leads, { full: true }),
        ],
        [
          "Sales",
          !partner.sales ? "-" : nFormatter(partner.sales, { full: true }),
        ],
        [
          "Revenue",
          !partner.saleAmount
            ? "-"
            : currencyFormatter(partner.saleAmount / 100, {
                minimumFractionDigits: partner.saleAmount % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2,
              }),
        ],
        [
          "Commissions",
          !partner.totalCommissions
            ? "-"
            : currencyFormatter(partner.totalCommissions / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
        ],
        [
          "Net revenue",
          !partner.netRevenue
            ? "-"
            : currencyFormatter(partner.netRevenue / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
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
