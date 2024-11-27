import { MiniAreaChart } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";

interface StatCardProps {
  title: string;
  event: "clicks" | "leads" | "sales";
  timeseries?: any;
  error?: any;
  color?: string;
  href?: string;
  total?: {
    clicks: number;
    leads: number;
    sales: number;
    saleAmount: number;
  };
}

export function StatCard({
  title,
  event,
  total,
  timeseries,
  error,
  color,
  href,
}: StatCardProps) {
  return (
    <Wrapper
      href={href}
      className="hover:drop-shadow-card-hover block rounded-md border border-neutral-300 bg-white p-5 transition-[filter]"
    >
      <span className="block text-sm text-neutral-500">{title}</span>
      {total !== undefined ? (
        <div className="flex items-center gap-1 text-2xl text-neutral-800">
          {nFormatter(total[event])}
          {event === "sales" && (
            <span className="text-base text-neutral-500">
              ({currencyFormatter(total.saleAmount / 100)})
            </span>
          )}
        </div>
      ) : (
        <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
      )}
      <div className="mt-2 h-16 w-full">
        {timeseries ? (
          <MiniAreaChart
            data={timeseries.map((d) => ({
              date: new Date(d.start),
              value: d[event],
            }))}
            curve={false}
            color={color}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load data.
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

const Wrapper = ({
  href,
  children,
  className,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
};
