import { EnrolledPartnerProps } from "@/lib/types";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PartnerStats({
  partner,
  error,
}: {
  partner?: EnrolledPartnerProps;
  error?: boolean;
}) {
  const { slug } = useParams() as { slug: string };
  return (
    <div className="@container/stats">
      <div
        className={cn(
          "@[695px]/stats:grid-cols-6 @xs/stats:grid-cols-3 grid grid-cols-2 ring-4 ring-black/5",
          "gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200",
        )}
      >
        {[
          {
            label: "Clicks",
            value: partner
              ? Number.isNaN(partner.totalClicks)
                ? "-"
                : nFormatter(partner.totalClicks, { full: true })
              : error
                ? "-"
                : undefined,
            href: `/${slug}/events?event=clicks&partnerId=${partner?.id ?? ""}`,
          },
          {
            label: "Leads",
            value: partner
              ? Number.isNaN(partner.totalLeads)
                ? "-"
                : nFormatter(partner.totalLeads, { full: true })
              : error
                ? "-"
                : undefined,
            href: `/${slug}/events?event=leads&partnerId=${partner?.id ?? ""}`,
          },
          {
            label: "Conversions",
            value: partner
              ? Number.isNaN(partner.totalConversions)
                ? "-"
                : nFormatter(partner.totalConversions, { full: true })
              : error
                ? "-"
                : undefined,
            href: `/${slug}/events?event=sales&partnerId=${partner?.id ?? ""}`,
          },
          {
            label: "Revenue",
            value: partner
              ? Number.isNaN(partner.totalSaleAmount)
                ? "-"
                : currencyFormatter((partner.totalSaleAmount ?? 0) / 100, {
                    trailingZeroDisplay: "stripIfInteger",
                  })
              : error
                ? "-"
                : undefined,
            href: `/${slug}/events?event=sales&partnerId=${partner?.id ?? ""}`,
          },
          {
            label: "Commissions",
            value: partner
              ? Number.isNaN(partner.totalCommissions)
                ? "-"
                : currencyFormatter((partner.totalCommissions ?? 0) / 100)
              : error
                ? "-"
                : undefined,
            href: `/${slug}/program/commissions?partnerId=${partner?.id ?? ""}`,
          },
          {
            label: "Net revenue",
            value: partner
              ? Number.isNaN(partner.netRevenue)
                ? "-"
                : currencyFormatter((partner.netRevenue ?? 0) / 100)
              : error
                ? "-"
                : undefined,
            href: `/${slug}/events?event=sales&partnerId=${partner?.id ?? ""}`,
          },
        ].map(({ label, value, href }) => {
          return (
            <Link
              key={label}
              href={href}
              target="_blank"
              className="flex flex-col bg-white p-3 transition-colors duration-150 hover:bg-neutral-50"
            >
              <span className="text-xs text-neutral-500">{label}</span>
              {value === undefined ? (
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <span className="text-content-emphasis text-sm font-medium">
                  {value}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
