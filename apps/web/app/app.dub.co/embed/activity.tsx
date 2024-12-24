import { InfoTooltip } from "@dub/ui";
import { nFormatter } from "@dub/utils";

export function EmbedWidgetActivity({
  clicks,
  leads,
  sales,
}: {
  clicks: number;
  leads: number;
  sales: number;
}) {
  return (
    <div className="col-span-2 grid h-full grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
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
        <div className="flex flex-col justify-between p-4">
          <span className="flex items-center gap-1 text-sm text-neutral-500">
            {label}
            <InfoTooltip content={description} />
          </span>
          <span className="font-semibold text-neutral-600">
            {nFormatter(value, { full: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
