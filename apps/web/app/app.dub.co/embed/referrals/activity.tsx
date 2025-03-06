import { InfoTooltip, MiniAreaChart } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions";
import { AnalyticsTimeseries } from "dub/models/components";
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
  const { data: analytics } = useSWR<AnalyticsTimeseries[]>(
    "/api/embed/referrals/analytics",
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 60000,
    },
  );

  return (
    <div className="border-border-subtle bg-bg-default divide-border-subtle grid h-full grid-cols-3 divide-x rounded-lg border sm:col-span-2">
      {[
        {
          label: "Clicks",
          value: clicks,
          description: "Total number of unique clicks your link has received",
        },
        {
          label: "Leads",
          value: leads,
          description: "Total number of signups that came from your link",
        },
        {
          label: "Sales",
          value: sales,
          description: "Total number of leads that converted to a paid account",
        },
      ].map(({ label, value, description }) => (
        <div key={label} className="relative flex flex-col justify-between p-4">
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
  );
}
