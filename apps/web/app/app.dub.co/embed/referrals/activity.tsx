import { CursorRays } from "@/ui/layout/sidebar/icons/cursor-rays";
import { InfoTooltip, MiniAreaChart } from "@dub/ui";
import { cn, nFormatter } from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions";
import { AnalyticsTimeseries } from "dub/models/components";
import { SVGProps, useId } from "react";
import useSWR from "swr";

export function ReferralsEmbedActivity({
  clicks,
  leads,
  sales,
}: {
  clicks: number;
  leads: number;
  sales: number;
}) {
  const isEmpty = clicks === 0 && leads === 0 && sales === 0;
  const { data: analytics } = useSWR<AnalyticsTimeseries[]>(
    !isEmpty && "/api/embed/referrals/analytics",
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 60000,
    },
  );

  return (
    <div className="border-border-subtle bg-bg-default rounded-lg border sm:col-span-2">
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="divide-border-subtle grid h-full grid-cols-3 divide-x">
          {[
            {
              label: "Clicks",
              value: clicks,
              description:
                "Total number of unique clicks your link has received",
            },
            {
              label: "Leads",
              value: leads,
              description: "Total number of signups that came from your link",
            },
            {
              label: "Sales",
              value: sales,
              description:
                "Total number of leads that converted to a paid account",
            },
          ].map(({ label, value, description }) => (
            <div
              key={label}
              className="relative flex flex-col justify-between p-4"
            >
              <div>
                <span className="text-content-subtle flex items-center gap-1 text-sm">
                  {label}
                  <InfoTooltip content={description} />
                </span>
                <span className="text-content-default text-base font-medium leading-none">
                  {nFormatter(value, { full: true })}
                </span>
              </div>
              <div className="xs:block hidden h-12">
                <MiniAreaChart
                  data={
                    analytics?.map((a) => ({
                      date: new Date(a.start),
                      value: a[label.toLowerCase()],
                    })) ?? []
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[inherit]">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 [mask-composite:intersect]",
          "[mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent),linear-gradient(transparent,black_10%,black_90%,transparent)]",
        )}
      >
        <EmptyStateBackground className="w-full opacity-40 dark:opacity-70" />
      </div>
      <div className="relative flex flex-col items-center p-4 text-center">
        <CursorRays className="text-content-subtle size-5" />
        <p className="text-content-default mt-3 text-sm font-semibold">
          No activity yet
        </p>
        <p className="text-content-subtle mt-1 text-sm font-medium">
          After your first click, your stats will show
        </p>
      </div>
    </div>
  );
}

function EmptyStateBackground({ className, ...rest }: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 408 82"
      className={cn(className, "text-content-muted")}
      {...rest}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M355.75 14.872 305 43.5l-50.75-9.872-50.75 22.705-50.75-4.833L102 28.692 51.25 48.436.5 56.333V82h406V5z"
        opacity="0.15"
      />
      <path
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m1 56.418 50.557-7.977a1 1 0 0 0 .213-.058l50.162-19.897a1 1 0 0 1 .792.023l50.116 23.416a1 1 0 0 0 .336.09l50.237 4.38a1 1 0 0 0 .487-.08l50.155-21.864a1 1 0 0 1 .577-.067l50.016 9.053a1 1 0 0 0 .665-.111l50.224-27.987q.13-.072.274-.104l50.522-11.003"
      />
    </svg>
  );
}
