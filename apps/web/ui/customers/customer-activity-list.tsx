import { CustomerActivityResponse } from "@/lib/types";
import { LinkLogo } from "@dub/ui";
import { CursorRays, MoneyBill2, UserCheck } from "@dub/ui/icons";
import { getApexDomain, getPrettyUrl } from "@dub/utils";

const activityData = {
  click: {
    icon: CursorRays,
    content: (event) => {
      const referer =
        !event.click?.referer || event.click.referer === "(direct)"
          ? "direct"
          : event.click.referer;
      return (
        <span className="flex items-center gap-1.5 [&>*]:min-w-0 [&>*]:truncate">
          Found{" "}
          <span className="flex items-center gap-2 rounded-md bg-neutral-100 px-1.5 py-1 font-mono text-xs leading-none">
            <LinkLogo
              className="size-3 shrink-0 sm:size-3"
              apexDomain={getApexDomain(event.click.url)}
            />
            <span className="min-w-0 truncate">
              {getPrettyUrl(event.link.shortLink)}
            </span>
          </span>
          via
          <span className="flex items-center gap-2 rounded-md bg-neutral-100 px-1.5 py-1 font-mono text-xs leading-none">
            <LinkLogo
              className="size-3 shrink-0 sm:size-3"
              apexDomain={getApexDomain(referer)}
            />
            <span className="min-w-0 truncate">
              {referer === "direct" ? referer : getPrettyUrl(referer)}
            </span>
          </span>
        </span>
      );
    },
  },
  lead: { icon: UserCheck, content: (event) => event.eventName || "New lead" },
  sale: { icon: MoneyBill2, content: (event) => event.eventName || "New sale" },
};

export function CustomerActivityList({
  activity,
  isLoading,
}: {
  activity?: CustomerActivityResponse;
  isLoading: boolean;
}) {
  return isLoading ? (
    <div className="flex h-32 w-full animate-pulse rounded-lg border border-transparent bg-neutral-100" />
  ) : !activity?.events?.length ? (
    <div className="text-sm text-neutral-500">
      {activity?.events ? "No activity" : "Failed to load activity"}
    </div>
  ) : (
    <ul className="flex flex-col gap-5 text-sm">
      {activity.events.map((event, index, events) => {
        const isLast = index === events.length - 1;
        const timestamp = new Date(event.timestamp);

        const month = timestamp.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const time = timestamp.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        });

        const { icon: Icon, content } = activityData[event.event];

        return (
          <li key={index} className="flex items-start gap-2">
            <div className="relative mr-3 flex-shrink-0">
              <Icon className="mt-0.5 size-4" />
              {!isLast && (
                <div className="absolute left-1/2 mt-2 h-8 border-l border-neutral-300" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1 whitespace-nowrap text-sm text-neutral-800">
              <div className="truncate">{content(event)}</div>
              <span className="truncate text-sm text-neutral-500">
                {month}, {time}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
