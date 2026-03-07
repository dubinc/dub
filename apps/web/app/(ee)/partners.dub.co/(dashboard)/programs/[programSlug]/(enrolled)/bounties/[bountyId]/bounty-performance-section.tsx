"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import { PartnerBountyProps, PartnerEarningsResponse } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  buttonVariants,
  CopyText,
  LinkLogo,
  LoadingSpinner,
  Table,
  TimestampTooltip,
  useTable,
} from "@dub/ui";
import { Areas, TimeSeriesChart, XAxis } from "@dub/ui/charts";
import { CircleDollar, UserPlus } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  fetcher,
  formatDateTimeSmart,
  getApexDomain,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";

type PerformanceAttribute = keyof typeof PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES;

const ATTRIBUTE_TO_ANALYTICS_FIELD: Partial<
  Record<PerformanceAttribute, "leads" | "sales" | "saleAmount">
> = {
  totalLeads: "leads",
  totalConversions: "sales",
  totalSaleAmount: "saleAmount",
};

const ATTRIBUTE_TO_EVENT_PARAMS: Partial<
  Record<PerformanceAttribute, { event: string; saleType?: string }>
> = {
  totalLeads: { event: "leads" },
  totalConversions: { event: "sales", saleType: "new" },
  totalSaleAmount: { event: "sales" },
};

const ATTRIBUTE_TO_TABLE_TITLE: Record<PerformanceAttribute, string> = {
  totalLeads: "Leads generated",
  totalConversions: "Conversions",
  totalSaleAmount: "Revenue generated",
  totalCommissions: "Commissions earned",
};

function getEventCount(analyticsCount: any, attribute?: PerformanceAttribute) {
  if (!analyticsCount || !attribute) {
    return 0;
  }

  const field = ATTRIBUTE_TO_ANALYTICS_FIELD[attribute];

  if (!field) {
    return 0;
  }

  return analyticsCount[field] ?? 0;
}

export function BountyPerformanceSection({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
          Performance
        </h2>
        <div className="border-border-subtle rounded-xl border bg-white p-5">
          <BountyPerformanceChart bounty={bounty} />
        </div>
      </div>
      <BountyPerformanceTable bounty={bounty} />
    </div>
  );
}

function BountyPerformanceChart({ bounty }: { bounty: PartnerBountyProps }) {
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;
  const isCurrency = attribute ? isCurrencyAttribute(attribute) : false;
  const isCommissions = attribute === "totalCommissions";

  const { data: analyticsTimeseries, error: analyticsError } =
    usePartnerAnalytics({
      groupBy: "timeseries",
      event: "composite",
      enabled: !isCommissions,
    });

  const { data: earningsTimeseries, error: earningsError } =
    usePartnerEarningsTimeseries({
      interval: "30d",
      enabled: isCommissions,
    });

  const data = useMemo(() => {
    if (isCommissions) {
      if (!earningsTimeseries) {
        return undefined;
      }

      return earningsTimeseries.map(
        ({ start, earnings }: { start: string; earnings: number }) => ({
          date: new Date(start),
          values: { main: earnings },
        }),
      );
    }

    if (!analyticsTimeseries || !attribute) {
      return undefined;
    }

    const field = ATTRIBUTE_TO_ANALYTICS_FIELD[attribute];
    if (!field) {
      return undefined;
    }

    return analyticsTimeseries.map((d: Record<string, any>) => ({
      date: new Date(d.start),
      values: { main: d[field] ?? 0 },
    }));
  }, [isCommissions, earningsTimeseries, analyticsTimeseries, attribute]);

  const error = isCommissions ? earningsError : analyticsError;

  const chartData = useMemo(() => {
    if (data === undefined) return undefined;
    if (data.length > 0) return data;

    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000),
      values: { main: 0 },
    }));
  }, [data]);

  return (
    <div className="h-44 w-full">
      {chartData ? (
        <TimeSeriesChart
          data={chartData}
          series={[
            {
              id: "main",
              valueAccessor: (d) => d.values.main,
              colorClassName: "text-violet-500",
              isActive: true,
            },
          ]}
          tooltipContent={(d) => (
            <div className="flex justify-between gap-6 whitespace-nowrap p-2 text-xs leading-none">
              <span className="font-medium text-neutral-700">
                {formatDateTooltip(d.date, {})}
              </span>
              <p className="text-right text-neutral-500">
                {isCurrency
                  ? currencyFormatter(d.values.main)
                  : nFormatter(d.values.main)}
              </p>
            </div>
          )}
        >
          <XAxis showAxisLine={false} />
          <Areas />
        </TimeSeriesChart>
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
  );
}

interface PerformanceRow {
  id: string;
  date: string;
  customer: { id: string; email: string; country?: string | null } | null;
  link: { id: string; shortLink: string; url: string } | null;
  amount?: number;
}

const PAGE_SIZE = 5;

function BountyPerformanceTable({ bounty }: { bounty: PartnerBountyProps }) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;
  const isCurrency = attribute ? isCurrencyAttribute(attribute) : false;
  const isCommissions = attribute === "totalCommissions";
  const metricLabel = attribute
    ? PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES[attribute].toLowerCase()
    : "entries";
  const tableTitle = attribute
    ? ATTRIBUTE_TO_TABLE_TITLE[attribute]
    : "Performance";

  const EmptyIcon =
    attribute === "totalLeads" || attribute === "totalConversions"
      ? UserPlus
      : CircleDollar;

  const eventParams = attribute
    ? ATTRIBUTE_TO_EVENT_PARAMS[attribute]
    : undefined;

  const [page, setPage] = useState(1);

  const pagination = useMemo(
    () => ({ pageIndex: page, pageSize: PAGE_SIZE }),
    [page],
  );

  const setPagination = (
    updater:
      | { pageIndex: number; pageSize: number }
      | ((prev: { pageIndex: number; pageSize: number }) => {
          pageIndex: number;
          pageSize: number;
        }),
  ) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setPage(next.pageIndex);
  };

  // Build events endpoint URL for non-commission attributes
  const eventsUrl = useMemo(() => {
    if (!programSlug || !eventParams) return null;
    const params = new URLSearchParams({
      event: eventParams.event,
      limit: String(PAGE_SIZE),
      page: String(page),
    });
    if (eventParams.saleType) {
      params.set("saleType", eventParams.saleType);
    }
    return `/api/partner-profile/programs/${programSlug}/events?${params.toString()}`;
  }, [programSlug, eventParams, page]);

  // Fetch events for leads/conversions/saleAmount
  const {
    data: events,
    isValidating: eventsValidating,
    error: eventsError,
  } = useSWR<any[]>(!isCommissions ? eventsUrl : null, fetcher, {
    keepPreviousData: true,
  });

  // Fetch event count via analytics endpoint
  const { data: analyticsCount } = usePartnerAnalytics({
    event: "composite",
    groupBy: "count",
    enabled: !isCommissions,
  });

  // Fetch earnings for commissions
  const {
    data: earnings,
    isValidating: earningsValidating,
    error: earningsError,
  } = useSWR<PartnerEarningsResponse[]>(
    isCommissions && programSlug
      ? `/api/partner-profile/programs/${programSlug}/earnings?pageSize=${PAGE_SIZE}&page=${page}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { data: earningsCount } = useSWR<{ count: number }>(
    isCommissions && programSlug
      ? `/api/partner-profile/programs/${programSlug}/earnings/count`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const isLoading = isCommissions ? earningsValidating : eventsValidating;
  const error = isCommissions ? earningsError : eventsError;

  // Normalize data into a common row shape
  const rows: PerformanceRow[] = useMemo(() => {
    if (isCommissions) {
      if (!earnings) return [];
      return earnings.map((earning) => ({
        id: earning.id,
        date: earning.createdAt,
        customer: earning.customer,
        link: earning.link ?? null,
        amount: earning.earnings,
      }));
    }

    if (!events) return [];
    return events.map((event) => ({
      id: event.eventId,
      date: event.timestamp,
      customer: event.customer ?? null,
      link: event.link ?? null,
      ...(attribute === "totalSaleAmount" && {
        amount: event.sale?.amount ?? event.saleAmount ?? 0,
      }),
    }));
  }, [isCommissions, earnings, events, attribute]);

  const viewAllHref = isCommissions
    ? `/programs/${programSlug}/earnings`
    : `/programs/${programSlug}/events`;

  const { table, ...tableProps } = useTable({
    data: rows,
    loading: isLoading,
    error: error ? "Failed to fetch data." : undefined,
    columns: [
      {
        id: "date",
        header: "Date",
        accessorKey: "date",
        minSize: 140,
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.date}
            side="right"
            rows={["local"]}
          >
            <span>{formatDateTimeSmart(row.original.date)}</span>
          </TimestampTooltip>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        minSize: 220,
        cell: ({ row }) =>
          row.original.customer ? (
            <CustomerRowItem
              customer={row.original.customer}
              className="px-4 py-2.5"
            />
          ) : (
            <p className="px-4 py-2.5">-</p>
          ),
      },
      {
        id: "link",
        header: "Link",
        accessorKey: "link",
        size: 200,
        cell: ({ row }) =>
          row.original.link ? (
            <div className="flex items-center gap-3">
              <LinkLogo
                apexDomain={getApexDomain(row.original.link.url)}
                className="size-4 shrink-0 sm:size-4"
              />
              <CopyText
                value={row.original.link.shortLink}
                successMessage="Copied link to clipboard!"
                className="truncate"
              >
                <span className="truncate" title={row.original.link.shortLink}>
                  {getPrettyUrl(row.original.link.shortLink)}
                </span>
              </CopyText>
            </div>
          ) : (
            "-"
          ),
      },
      ...(isCurrency
        ? [
            {
              id: "amount",
              header: isCommissions ? "Earnings" : "Amount",
              accessorKey: "amount",
              cell: ({ row }: { row: any }) =>
                currencyFormatter(row.original.amount ?? 0),
            },
          ]
        : []),
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: isCommissions
      ? earningsCount?.count || 0
      : getEventCount(analyticsCount, attribute) || 0,
    thClassName: "border-l-transparent",
    tdClassName: (columnId) =>
      cn("border-l-transparent", columnId === "customer" && "p-0"),
    resourceName: () => metricLabel,
    emptyState: (
      <AnimatedEmptyState
        title={`No ${metricLabel} recorded yet`}
        description={`${tableTitle} will appear here once you start generating activity.`}
        cardContent={() => (
          <>
            <EmptyIcon className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    ),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
          {tableTitle}
        </h2>
        <Link
          href={viewAllHref}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-7 items-center rounded-lg border px-2 text-sm",
          )}
        >
          View all
        </Link>
      </div>
      {isLoading || rows.length ? (
        <Table
          {...tableProps}
          table={table}
          containerClassName="border-neutral-200"
          scrollWrapperClassName="min-h-[315px]"
        />
      ) : (
        <AnimatedEmptyState
          title={`No ${metricLabel} recorded yet`}
          description={`${tableTitle} will appear here once you start generating activity.`}
          cardContent={() => (
            <>
              <EmptyIcon className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}
