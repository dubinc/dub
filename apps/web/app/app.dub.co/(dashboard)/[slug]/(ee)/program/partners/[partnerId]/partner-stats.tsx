import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { ArrowUpRight2, TimestampTooltip } from "@dub/ui";
import { cn, currencyFormatter, nFormatter, timeAgo } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function PartnerStats({
  partner,
  error,
}: {
  partner?: EnrolledPartnerExtendedProps;
  error?: boolean;
}) {
  const { slug } = useParams() as { slug: string };

  const lastLeadDate = partner?.lastLeadAt
    ? new Date(partner.lastLeadAt)
    : null;
  const lastConversionDate = partner?.lastConversionAt
    ? new Date(partner.lastConversionAt)
    : null;
  const approved = partner?.status === "approved";
  const leadsLastAt =
    approved && lastLeadDate && !Number.isNaN(lastLeadDate.getTime())
      ? lastLeadDate
      : undefined;
  const conversionsLastAt =
    approved &&
    lastConversionDate &&
    !Number.isNaN(lastConversionDate.getTime())
      ? lastConversionDate
      : undefined;

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
            href: partner?.id
              ? `/${slug}/events?event=clicks&partnerId=${partner.id}&interval=all`
              : undefined,
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
            href: partner?.id
              ? `/${slug}/events?event=leads&partnerId=${partner.id}&interval=all`
              : undefined,
            lastAt: leadsLastAt,
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
            href: partner?.id
              ? `/${slug}/events?event=sales&partnerId=${partner.id}&interval=all&saleType=new`
              : undefined,
            lastAt: conversionsLastAt,
          },
          {
            label: "Revenue",
            value: partner
              ? Number.isNaN(partner.totalSaleAmount)
                ? "-"
                : currencyFormatter(partner.totalSaleAmount ?? 0, {
                    trailingZeroDisplay: "stripIfInteger",
                  })
              : error
                ? "-"
                : undefined,
            href: partner?.id
              ? `/${slug}/events?event=sales&partnerId=${partner.id}&interval=all`
              : undefined,
          },
          {
            label: "Commissions",
            value: partner
              ? Number.isNaN(partner.totalCommissions)
                ? "-"
                : currencyFormatter(partner.totalCommissions ?? 0)
              : error
                ? "-"
                : undefined,
            href: partner?.id
              ? `/${slug}/program/commissions?partnerId=${partner.id}`
              : undefined,
          },
          {
            label: "Net revenue",
            value: partner
              ? Number.isNaN(partner.netRevenue)
                ? "-"
                : currencyFormatter(partner.netRevenue ?? 0)
              : error
                ? "-"
                : undefined,
            href: partner?.id
              ? `/${slug}/events?event=sales&partnerId=${partner.id}&interval=all`
              : undefined,
          },
        ].map(({ label, value, href, lastAt }) => {
          const As = href ? Link : "div";
          return (
            <As
              key={label}
              href={href ?? "#"}
              target="_blank"
              className="group relative flex flex-col bg-white p-3 transition-colors duration-150 hover:bg-neutral-50"
            >
              <ArrowUpRight2 className="text-content-subtle absolute right-3 top-3 size-3.5 opacity-50 transition-opacity duration-150 group-hover:opacity-100" />
              <span className="text-xs text-neutral-500">{label}</span>
              {value === undefined ? (
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <span className="text-content-emphasis text-sm font-medium">
                  {value}
                </span>
              )}
              {lastAt ? (
                <TimestampTooltip
                  timestamp={lastAt}
                  rows={["local", "utc", "unix"]}
                  side="top"
                  delayDuration={250}
                >
                  <span className="text-content-muted absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] cursor-help text-right text-[0.6875rem] leading-tight underline decoration-neutral-300/70 decoration-dotted underline-offset-2 hover:decoration-neutral-400">
                    Last {timeAgo(lastAt, { withAgo: true })}
                  </span>
                </TimestampTooltip>
              ) : null}
            </As>
          );
        })}
      </div>
    </div>
  );
}
