"use client";

import { PAID_TRAFFIC_PLATFORMS_CONFIG } from "@/lib/api/fraud/constants";
import { useFraudEventsPaginated } from "@/lib/swr/use-fraud-events-paginated";
import useWorkspace from "@/lib/swr/use-workspace";
import { PaidTrafficPlatform } from "@/lib/types";
import { fraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import {
  Bing,
  Button,
  DynamicTooltipWrapper,
  Facebook,
  Google,
  LinkedIn,
  Reddit,
  Table,
  TikTok,
  TimestampTooltip,
  Twitter,
  useTable,
} from "@dub/ui";
import { capitalize, formatDateTimeSmart, getPrettyUrl } from "@dub/utils";
import Link from "next/link";
import { z } from "zod";

type EventDataProps = z.infer<
  (typeof fraudEventSchemas)["paidTrafficDetected"]
>;

const PAID_TRAFFIC_PLATFORM_ICONS: Record<
  PaidTrafficPlatform,
  React.ComponentType<{ className?: string }>
> = {
  google: Google,
  facebook: Facebook,
  x: Twitter,
  bing: Bing,
  linkedin: LinkedIn,
  reddit: Reddit,
  tiktok: TikTok,
};

export function FraudPaidTrafficDetectedTable() {
  const { slug: workspaceSlug } = useWorkspace();

  const {
    fraudEvents,
    loading,
    error,
    pagination,
    setPagination,
    fraudEventsCount,
  } = useFraudEventsPaginated<EventDataProps>();

  const table = useTable({
    data: fraudEvents || [],
    pagination,
    onPaginationChange: setPagination,
    rowCount: fraudEventsCount ?? 0,
    columns: [
      {
        id: "date",
        header: "Date",
        minSize: 140,
        size: 160,
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            side="right"
            rows={["local", "utc", "unix"]}
            delayDuration={150}
          >
            <p>{formatDateTimeSmart(row.original.createdAt)}</p>
          </TimestampTooltip>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 180,
        size: 220,
        cell: ({ row }) =>
          row.original.customer ? (
            <CustomerRowItem customer={row.original.customer} />
          ) : (
            "-"
          ),
      },
      {
        id: "source",
        header: "Source",
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          const metadata = row.original.metadata as EventDataProps["metadata"];

          if (!metadata || !metadata.source) {
            return "-";
          }

          const platform = PAID_TRAFFIC_PLATFORMS_CONFIG.find(
            (p) => p.id === metadata.source,
          );

          const Icon = PAID_TRAFFIC_PLATFORM_ICONS[metadata.source];

          return (
            <DynamicTooltipWrapper
              tooltipProps={
                metadata.url
                  ? {
                      content: (
                        <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-600">
                          <HighlightedUrl
                            url={metadata.url}
                            queryParams={platform?.queryParams}
                          />
                        </div>
                      ),
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className="size-4 shrink-0" />}

                {metadata.url ? (
                  <span className="truncate text-sm text-neutral-600 underline decoration-dotted underline-offset-2">
                    {getPrettyUrl(metadata.url)}
                  </span>
                ) : (
                  <span className="truncate text-sm text-neutral-600">
                    {capitalize(metadata.source || platform?.name)}
                  </span>
                )}
              </div>
            </DynamicTooltipWrapper>
          );
        },
      },
      {
        id: "view",
        header: "",
        enableHiding: false,
        minSize: 100,
        size: 100,
        maxSize: 100,
        cell: ({ row }) => {
          if (!row.original.customer) return null;

          return (
            <Link
              href={`/${workspaceSlug}/events?interval=all&customerId=${row.original.customer.id}`}
              target="_blank"
            >
              <Button
                variant="secondary"
                text="View"
                className="h-7 w-fit rounded-lg px-2.5 py-2"
              />
            </Link>
          );
        },
      },
    ],
    resourceName: (p) => `event${p ? "s" : ""}`,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading,
    error,
  });

  return <Table {...table} />;
}

// Highlight query parameters in the URL based on PAID_TRAFFIC_PLATFORMS_CONFIG.queryParams
function HighlightedUrl({
  url,
  queryParams,
}: {
  url: string;
  queryParams?: string[];
}) {
  if (!queryParams || queryParams.length === 0) {
    return <span className="break-all">{url}</span>;
  }

  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    const searchParams = Array.from(urlObj.searchParams.entries());

    if (searchParams.length === 0) {
      return <span className="break-all">{url}</span>;
    }

    return (
      <span className="break-all">
        {baseUrl}
        {urlObj.search && "?"}
        {searchParams.map(([key, value], index) => {
          const isHighlighted = queryParams.includes(key);

          return (
            <span key={index}>
              <span className={isHighlighted ? "text-amber-600" : ""}>
                {key}={value}
              </span>
              {index < searchParams.length - 1 && "&"}
            </span>
          );
        })}
        {urlObj.hash}
      </span>
    );
  } catch {
    return <span className="break-all">{url}</span>;
  }
}
