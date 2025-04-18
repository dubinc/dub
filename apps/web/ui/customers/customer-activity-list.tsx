import { CustomerActivityResponse } from "@/lib/types";
import {
  Button,
  DynamicTooltipWrapper,
  LinkLogo,
  useCopyToClipboard,
} from "@dub/ui";
import { CursorRays, MoneyBill2, UserCheck } from "@dub/ui/icons";
import { formatDateTimeSmart, getApexDomain, getPrettyUrl } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

const activityData = {
  click: {
    icon: CursorRays,
    content: (event) => {
      const { slug, programSlug } = useParams();

      const analyticsBaseUrl = programSlug
        ? `/programs/${programSlug}/analytics`
        : `/${slug}/analytics`;

      const referer =
        !event.click?.referer || event.click.referer === "(direct)"
          ? "direct"
          : event.click.referer;
      const refererUrl = event.click.refererUrl;

      return (
        <span className="flex items-center gap-1.5 [&>*]:min-w-0 [&>*]:truncate">
          Found{" "}
          <Link
            href={
              programSlug
                ? `${analyticsBaseUrl}?domain=${event.link.domain}&key=${event.link.key}`
                : `/${slug}/links/${getPrettyUrl(event.link.shortLink)}`
            }
            target="_blank"
            className="flex items-center gap-2 rounded-md bg-neutral-100 px-1.5 py-1 font-mono text-xs leading-none transition-colors hover:bg-neutral-200/80"
          >
            <LinkLogo
              className="size-3 shrink-0 sm:size-3"
              apexDomain={getApexDomain(event.click.url)}
            />
            <span className="min-w-0 truncate">
              {getPrettyUrl(event.link.shortLink)}
            </span>
          </Link>
          via
          <DynamicTooltipWrapper
            tooltipProps={
              refererUrl && refererUrl != "(direct)"
                ? {
                    content: (
                      <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-600">
                        Referrer URL:{" "}
                        <Link
                          href={`${analyticsBaseUrl}?refererUrl=${refererUrl}`}
                          target="_blank"
                          className="cursor-alias text-neutral-500 decoration-dotted underline-offset-2 transition-colors hover:text-neutral-950 hover:underline"
                        >
                          {getPrettyUrl(refererUrl)}
                        </Link>
                      </div>
                    ),
                  }
                : undefined
            }
          >
            <div>
              <Link
                href={`${analyticsBaseUrl}?referer=${referer === "direct" ? "(direct)" : referer}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md bg-neutral-100 px-1.5 py-1 font-mono text-xs leading-none transition-colors hover:bg-neutral-200/80"
              >
                <LinkLogo
                  className="size-3 shrink-0 sm:size-3"
                  apexDomain={referer === "direct" ? undefined : referer}
                />
                <span className="min-w-0 truncate">{referer}</span>
              </Link>
            </div>
          </DynamicTooltipWrapper>
        </span>
      );
    },
  },

  lead: {
    icon: UserCheck,
    content: (event) => {
      const metadata = event.metadata ? JSON.parse(event.metadata) : null;

      return (
        <div className="flex flex-col gap-1">
          <span>{event.eventName || "New lead"}</span>
          {metadata && <MetadataViewer metadata={metadata} />}
        </div>
      );
    },
  },

  sale: {
    icon: MoneyBill2,
    content: (event) => {
      const metadata = event.metadata ? JSON.parse(event.metadata) : null;

      return (
        <div className="flex flex-col gap-1">
          <span>{event.eventName || "New sale"}</span>
          {metadata && <MetadataViewer metadata={metadata} />}
        </div>
      );
    },
  },
};

// Display the event metadata
function MetadataViewer({ metadata }: { metadata: Record<string, any> }) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <DynamicTooltipWrapper
      tooltipProps={{
        content: (
          <div className="flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-200 bg-white p-4">
            <div className="flex h-[200px] w-[280px] overflow-hidden rounded-md border border-neutral-200 bg-white sm:h-[300px] sm:w-[350px]">
              <div className="w-full overflow-auto">
                <pre className="p-2 text-xs text-neutral-600">
                  {JSON.stringify(metadata, null, 1)}
                </pre>
              </div>
            </div>

            <Button
              text={copied ? "Copied!" : "Copy metadata"}
              onClick={() => copyToClipboard(JSON.stringify(metadata, null, 1))}
            />
          </div>
        ),
        align: "start",
      }}
    >
      <button
        type="button"
        className="hidden items-center gap-1 rounded-md border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 sm:inline-flex"
      >
        View metadata
      </button>
    </DynamicTooltipWrapper>
  );
}

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
        const { icon: Icon, content } = activityData[event.event];

        return (
          <li key={index} className="flex items-start gap-2">
            <div className="relative mr-3 flex-shrink-0">
              <Icon className="mt-0.5 size-4" />
              {!isLast && (
                <div className="absolute left-1/2 mt-2 h-8 border-l border-neutral-300 lg:h-3" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-x-4 gap-y-1 whitespace-nowrap text-sm text-neutral-800 lg:grow lg:flex-row lg:justify-between">
              <div className="truncate">{content(event)}</div>
              <span className="shrink-0 truncate text-sm text-neutral-500">
                {formatDateTimeSmart(event.timestamp)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
