import useProgramMetrics from "@/lib/swr/use-program-metrics";
import { Icon } from "@dub/ui";
import { Check2, CircleDollar, MoneyBills2, Users } from "@dub/ui/icons";
import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ProgramMetrics() {
  const { metrics, error } = useProgramMetrics();

  return (
    <div className="grid grid-cols-1 divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 max-md:divide-y md:grid-cols-4 md:divide-x">
      <Stat
        icon={Users}
        label="Partners"
        tab="partners"
        value={metrics?.partnersCount}
        error={error}
      />
      <Stat
        icon={Check2}
        label="Sales"
        tab="commissions" // TODO update to program analytics sales tab
        value={metrics?.commissionsCount}
        error={error}
      />
      <Stat
        icon={CircleDollar}
        label="Commissions"
        value={metrics?.commissions}
        tab="commissions"
        error={error}
        isCurrency
      />
      <Stat
        icon={MoneyBills2}
        label="Payouts"
        tab="payouts"
        value={metrics?.payouts}
        error={error}
        isCurrency
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tab,
  error,
  isCurrency = false,
}: {
  icon: Icon;
  label: string;
  value: number | undefined;
  tab: string;
  error: boolean;
  isCurrency?: boolean;
}) {
  const { slug } = useParams();
  const isLoading = value === undefined && !error;

  return (
    <Link
      href={`/${slug}/program/${tab}`}
      className="flex flex-row items-center gap-x-4 gap-y-5 p-3 transition-colors hover:bg-neutral-50 md:flex-col md:items-start lg:p-5"
    >
      <div className="flex size-10 items-center justify-center rounded-md bg-neutral-100">
        <Icon className="size-4 text-neutral-900" />
      </div>
      <div className="w-full">
        <div className="text-sm text-neutral-500">{label}</div>
        {isLoading ? (
          <div className="h-7 w-24 animate-pulse rounded-md bg-neutral-200 md:mt-2.5 md:h-8 lg:h-11" />
        ) : (
          <div className="truncate text-xl text-neutral-800 md:mt-2 md:text-2xl lg:text-3xl">
            {error ? (
              "-"
            ) : (
              <NumberFlow
                value={isCurrency ? value! / 100 : value || 0}
                format={
                  isCurrency
                    ? {
                        style: "currency",
                        currency: "USD",
                        // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                        trailingZeroDisplay: "stripIfInteger",
                      }
                    : undefined
                }
              />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
