import { CustomerEnriched } from "@/lib/types";
import { ArrowUpRight2 } from "@dub/ui/icons";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";
import { CSSProperties, useMemo } from "react";

export function CustomerStats({
  customer,
  error,
}: {
  customer: CustomerEnriched | undefined;
  error?: boolean;
}) {
  const stats: { label: string; value?: string; href?: string }[] = useMemo(
    () => [
      {
        label: "Conversions",
        value: customer
          ? nFormatter(customer.sales ?? 0, { full: true })
          : error
            ? "-"
            : undefined,
      },
      {
        label: "Lifetime value",
        value: customer
          ? currencyFormatter(customer.saleAmount ?? 0)
          : error
            ? "-"
            : undefined,
      },
    ],
    [customer, error],
  );

  return (
    <div className="@container/stats">
      <div
        className={cn(
          "@xs/stats:grid-cols-[repeat(var(--cols),1fr)] grid grid-cols-1 ring-4 ring-black/5",
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
                "group relative flex flex-col bg-white p-3",
                href && "transition-colors duration-150 hover:bg-neutral-50",
              )}
            >
              {href && (
                <ArrowUpRight2 className="text-content-subtle absolute right-3 top-3 size-3.5 opacity-50 transition-opacity duration-150 group-hover:opacity-100" />
              )}
              <span className="text-xs text-neutral-500">{label}</span>
              {value === undefined ? (
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <span className="text-content-emphasis text-sm font-medium">
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
