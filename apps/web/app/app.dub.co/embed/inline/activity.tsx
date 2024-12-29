import { InfoTooltip, MiniAreaChart } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { fetcher } from "@dub/utils/src/functions";
import { subDays } from "date-fns";
import { AnalyticsTimeseries } from "dub/models/components";
import useSWR from "swr";

const TMP_CHART_DATA = [...Array(30)]
  .map((_, i) => ({
    date: subDays(new Date(), i),
    value: Math.floor(Math.random() * 100 * (30 - i)),
  }))
  .reverse();

export function EmbedActivity({
  clicks,
  leads,
  sales,
}: {
  clicks: number;
  leads: number;
  sales: number;
}) {
  const { data: analytics } = useSWR<AnalyticsTimeseries[]>(
    `/api/embed/analytics`,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 60000,
    },
  );

  return (
    <div className="grid h-full grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-white sm:col-span-2">
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
            <span className="flex items-center gap-1 text-sm text-neutral-500">
              {label}
              <InfoTooltip content={description} />
            </span>
            <span className="text-base font-medium leading-none text-neutral-700">
              {nFormatter(value, { full: true })}
            </span>
          </div>
          <div className="xs:block hidden h-12">
            <MiniAreaChart
              data={
                analytics?.map((a) => ({
                  date: new Date(a.start),
                  value: a[label.toLowerCase()],
                })) ?? TMP_CHART_DATA
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
