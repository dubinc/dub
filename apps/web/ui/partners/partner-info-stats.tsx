import { EnrolledPartnerProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PartnerInfoStats({
  partner,
  className,
}: {
  partner: EnrolledPartnerProps;
  className?: string;
}) {
  const { slug } = useParams() as { slug: string };
  return (
    <div
      className={cn(
        "xs:grid-cols-3 grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        className,
      )}
    >
      {[
        {
          label: "Clicks",
          value: Number.isNaN(partner.totalClicks)
            ? "-"
            : nFormatter(partner.totalClicks, { full: true }),
          href: `/${slug}/events?event=clicks&partnerId=${partner.id}&interval=1y`,
        },
        {
          label: "Leads",
          value: Number.isNaN(partner.totalLeads)
            ? "-"
            : nFormatter(partner.totalLeads, { full: true }),
          href: `/${slug}/events?event=leads&partnerId=${partner.id}&interval=1y`,
        },
        {
          label: "Conversions",
          value: Number.isNaN(partner.totalConversions)
            ? "-"
            : nFormatter(partner.totalConversions, { full: true }),
          href: `/${slug}/events?event=sales&partnerId=${partner.id}&interval=1y`,
        },
        {
          label: "Revenue",
          value: Number.isNaN(partner.totalSaleAmount)
            ? "-"
            : currencyFormatter(partner.totalSaleAmount / 100, {
                trailingZeroDisplay: "stripIfInteger",
              }),
          href: `/${slug}/events?event=sales&partnerId=${partner.id}&interval=1y`,
        },
        {
          label: "Commissions",
          value: Number.isNaN(partner.totalCommissions)
            ? "-"
            : currencyFormatter(partner.totalCommissions / 100),
          href: `/${slug}/program/commissions?partnerId=${partner.id}`,
        },
        {
          label: "Net revenue",
          value: Number.isNaN(partner.netRevenue)
            ? "-"
            : currencyFormatter(partner.netRevenue / 100),
          href: `/${slug}/events?event=sales&partnerId=${partner.id}&interval=1y`,
        },
      ].map(({ label, value, href }) => (
        <Link
          key={label}
          href={href}
          target="_blank"
          className="flex flex-col bg-neutral-50 p-3 transition-colors duration-150 hover:bg-neutral-100"
        >
          <span className="text-xs text-neutral-500">{label}</span>
          <span className="text-base text-neutral-900">{value}</span>
        </Link>
      ))}
    </div>
  );
}
