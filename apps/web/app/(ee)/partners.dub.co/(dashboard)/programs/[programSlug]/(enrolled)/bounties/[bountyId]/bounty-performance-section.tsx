"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import usePartnerAnalytics from "@/lib/swr/use-partner-analytics";
import { usePartnerEarningsTimeseries } from "@/lib/swr/use-partner-earnings-timeseries";
import {
  LeadEvent,
  PartnerBountyProps,
  PartnerEarningsResponse,
  SaleEvent,
} from "@/lib/types";
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
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";

type PerformanceAttribute = keyof typeof PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES;

interface PerformanceRow {
  id: string;
  date: string | Date;
  customer: {
    id: string;
    email?: string | null;
    name?: string | null;
    avatar?: string | null;
  } | null;
  link: {
    id: string;
    shortLink: string;
    url: string;
  } | null;
  amount?: number;
}

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
  const startDate =
    bounty.performanceScope === "new" ? new Date(bounty.startsAt) : undefined;

  const { data: analyticsTimeseries, error: analyticsError } =
    usePartnerAnalytics({
      groupBy: "timeseries",
      event: "composite",
      ...(startDate && { start: startDate, end: new Date() }),
      enabled: !isCommissions,
    });

  const { data: earningsTimeseries, error: earningsError } =
    usePartnerEarningsTimeseries({
      interval: "30d",
      ...(startDate && { start: startDate, end: new Date() }),
      enabled: isCommissions,
    });

  const data = useMemo(() => {
    if (isCommissions) {
      if (!earningsTimeseries) {
        return undefined;
      }

      if (!Array.isArray(earningsTimeseries)) {
        return [];
      }

      return earningsTimeseries.map(
        ({ start, earnings }: { start: string; earnings: number }) => ({
          date: new Date(start),
          values: { main: earnings },
        }),
      );
    }

    if (!attribute) {
      return [];
    }

    if (!analyticsTimeseries) {
      return undefined;
    }

    const field = ATTRIBUTE_TO_ANALYTICS_FIELD[attribute];
    if (!field || !Array.isArray(analyticsTimeseries)) {
      return [];
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

const PAGE_SIZE = 5;

function usePaginationState() {
  const [page, setPage] = useState(1);
  const pagination = useMemo(
    () => ({ pageIndex: page, pageSize: PAGE_SIZE }),
    [page],
  );

  const onPaginationChange = (
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

  return { page, pagination, onPaginationChange };
}

function PerformanceTableShell({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
          {title}
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
      {children}
    </div>
  );
}

function BountyPerformanceTable({ bounty }: { bounty: PartnerBountyProps }) {
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;

  if (attribute === "totalCommissions") {
    return <BountyPerformanceCommissionsTable bounty={bounty} />;
  }

  return <BountyPerformanceEventsTable bounty={bounty} />;
}

function BountyPerformanceEventsTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;

  const isCurrency = attribute ? isCurrencyAttribute(attribute) : false;
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

  const startDate =
    bounty.performanceScope === "new" ? new Date(bounty.startsAt) : undefined;

  const { page, pagination, onPaginationChange } = usePaginationState();

  const eventsUrl = useMemo(() => {
    if (!programSlug || !eventParams) {
      return null;
    }

    const params = new URLSearchParams({
      event: eventParams.event,
      limit: String(PAGE_SIZE),
      page: String(page),
    });

    if (eventParams.saleType) {
      params.set("saleType", eventParams.saleType);
    }

    if (startDate) {
      params.set("start", startDate.toISOString());
    }
    return `/api/partner-profile/programs/${programSlug}/events?${params.toString()}`;
  }, [programSlug, eventParams, page, startDate]);

  const {
    data: events,
    isValidating: isLoading,
    error,
  } = useSWR<(LeadEvent | SaleEvent)[]>(eventsUrl, fetcher, {
    keepPreviousData: true,
  });

  const { data: analyticsCount } = usePartnerAnalytics({
    event: "composite",
    groupBy: "count",
    ...(startDate && { start: startDate, end: new Date() }),
    enabled: true,
  });

  const rows = useMemo<PerformanceRow[]>(() => {
    if (!events) {
      return [];
    }

    return events.map((event) => ({
      id: event.eventId,
      date: event.timestamp,
      customer: event.customer ?? null,
      link: event.link ?? null,
      ...(attribute === "totalSaleAmount" && {
        amount:
          ("sale" in event ? event.sale?.amount : undefined) ??
          ("saleAmount" in event ? event.saleAmount : 0),
      }),
    }));
  }, [events, attribute]);

  const analyticsField = attribute
    ? ATTRIBUTE_TO_ANALYTICS_FIELD[attribute]
    : undefined;
  const totalCount = analyticsField ? analyticsCount?.[analyticsField] ?? 0 : 0;

  const columns = useMemo<ColumnDef<PerformanceRow, any>[]>(() => {
    const base: ColumnDef<PerformanceRow, any>[] = [
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
    ];

    if (isCurrency) {
      base.push({
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => currencyFormatter(row.original.amount ?? 0),
      });
    }

    return base;
  }, [isCurrency]);

  const { table, ...tableProps } = useTable({
    data: rows,
    loading: isLoading,
    error: error ? "Failed to fetch data." : undefined,
    columns,
    pagination,
    onPaginationChange,
    rowCount: totalCount,
    thClassName: "border-l-transparent",
    tdClassName: (columnId: string) =>
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
    <PerformanceTableShell
      title={tableTitle}
      viewAllHref={`/programs/${programSlug}/events`}
    >
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-neutral-200"
        scrollWrapperClassName="min-h-[315px]"
      />
    </PerformanceTableShell>
  );
}

function BountyPerformanceCommissionsTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();

  const startDate =
    bounty.performanceScope === "new" ? new Date(bounty.startsAt) : undefined;

  const { page, pagination, onPaginationChange } = usePaginationState();

  const startParam = startDate ? `&start=${startDate.toISOString()}` : "";

  const {
    data: earnings,
    isValidating: isLoading,
    error,
  } = useSWR<PartnerEarningsResponse[]>(
    programSlug
      ? `/api/partner-profile/programs/${programSlug}/earnings?pageSize=${PAGE_SIZE}&page=${page}${startParam}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { data: earningsCount } = useSWR<{ count: number }>(
    programSlug
      ? `/api/partner-profile/programs/${programSlug}/earnings/count${startDate ? `?start=${startDate.toISOString()}` : ""}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const rows = useMemo<PerformanceRow[]>(() => {
    if (!earnings) {
      return [];
    }

    return earnings.map((earning) => ({
      id: earning.id,
      date: earning.createdAt,
      customer: earning.customer,
      link: earning.link ?? null,
      amount: earning.earnings,
    }));
  }, [earnings]);

  const columns = useMemo<ColumnDef<PerformanceRow, any>[]>(
    () => [
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
      {
        id: "earnings",
        header: "Earnings",
        accessorKey: "amount",
        cell: ({ row }) => currencyFormatter(row.original.amount ?? 0),
      },
    ],
    [],
  );

  const { table, ...tableProps } = useTable({
    data: rows,
    loading: isLoading,
    error: error ? "Failed to fetch data." : undefined,
    columns,
    pagination,
    onPaginationChange,
    rowCount: earningsCount?.count || 0,
    thClassName: "border-l-transparent",
    tdClassName: (columnId: string) =>
      cn("border-l-transparent", columnId === "customer" && "p-0"),
    resourceName: () => "commissions",
    emptyState: (
      <AnimatedEmptyState
        title="No commissions recorded yet"
        description="Commissions earned will appear here once you start generating activity."
        cardContent={() => (
          <>
            <CircleDollar className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    ),
  });

  return (
    <PerformanceTableShell
      title="Commissions earned"
      viewAllHref={`/programs/${programSlug}/earnings`}
    >
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-neutral-200"
        scrollWrapperClassName="min-h-[315px]"
      />
    </PerformanceTableShell>
  );
}
