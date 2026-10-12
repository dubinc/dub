import { CustomerEnriched } from "@/lib/types";
import { TimestampTooltip } from "@dub/ui";
import { ArrowUpRight2 } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  formatDateTimeSmart,
  nFormatter,
  pluralize,
} from "@dub/utils";
import { formatDistance } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useMemo } from "react";

export function CustomerStats({
  customer,
}: {
  customer?: Pick<
    CustomerEnriched,
    | "sales"
    | "saleAmount"
    | "createdAt"
    | "firstSaleAt"
    | "subscriptionCanceledAt"
  >;
}) {
  const { slug: workspaceSlug, customerId } = useParams<{
    slug: string;
    customerId: string;
  }>();

  const stats: {
    label: string;
    value?: string | React.ReactNode;
    href?: string;
  }[] = useMemo(
    () => [
      {
        label: "First sale date",
        value: !customer ? undefined : customer.firstSaleAt ? (
          <TimestampTooltip
            timestamp={customer.firstSaleAt}
            side="right"
            rows={["local", "utc"]}
          >
            <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
              {formatDateTimeSmart(customer.firstSaleAt)}
            </span>
          </TimestampTooltip>
        ) : (
          "-"
        ),
      },
      {
        label: "Time to sale",
        value: !customer
          ? undefined
          : customer.firstSaleAt
            ? formatDistance(customer.firstSaleAt, customer.createdAt)
            : "-",
      },
      {
        label: "Lifetime value",
        value: customer ? (
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className="truncate">
              {currencyFormatter(customer.saleAmount ?? 0)}
            </span>
            <span className="text-xs font-normal text-neutral-500">
              ({nFormatter(customer.sales ?? 0, { full: true })}{" "}
              {pluralize("sale", customer.sales ?? 0)})
            </span>
          </div>
        ) : undefined,
        href: `/${workspaceSlug}/events?event=sales&customerId=${customerId}&interval=all`,
      },
      {
        label: "Subscription canceled",
        value: !customer ? undefined : customer.subscriptionCanceledAt ? (
          <TimestampTooltip
            timestamp={customer.subscriptionCanceledAt}
            side="right"
            rows={["local", "utc"]}
          >
            <span className="hover:text-content-emphasis underline decoration-dotted underline-offset-2">
              {formatDateTimeSmart(customer.subscriptionCanceledAt)}
            </span>
          </TimestampTooltip>
        ) : (
          "-"
        ),
      },
    ],
    [workspaceSlug, customer],
  );

  return (
    <div className="@container/stats">
      <div
        className={cn(
          // 2x2 on narrow viewports; 4-up only when each cell has room for labels
          "@[560px]/stats:grid-cols-[repeat(var(--cols),minmax(0,1fr))] grid grid-cols-2 ring-4 ring-black/5",
          "gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200",
        )}
        style={
          {
            "--cols": stats.length,
          } as CSSProperties
        }
      >
        {stats.map(({ label, value, href }) => {
          const As = href ? Link : "div";
          return (
            <As
              key={label}
              href={href ?? "#"}
              target="_blank"
              className={cn(
                "group relative flex min-w-0 flex-col gap-0.5 bg-white p-3",
                href && "pr-8 transition-colors duration-150 hover:bg-neutral-50",
              )}
            >
              {href && (
                <ArrowUpRight2 className="text-content-subtle absolute right-3 top-3 size-3.5 opacity-50 transition-opacity duration-150 group-hover:opacity-100" />
              )}
              <span className="text-xs leading-tight text-neutral-500">
                {label}
              </span>
              {value === undefined ? (
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <span className="text-content-emphasis min-w-0 text-sm font-medium leading-snug">
                  {value}
                </span>
              )}
            </As>
          );
        })}
      </div>
    </div>
  );
}
