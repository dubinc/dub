"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import { LeadEvent, PartnerBountyProps, SaleEvent } from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  CopyText,
  LinkLogo,
  LoadingSpinner,
  Table,
  TimestampTooltip,
  useTable,
  useTablePagination,
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
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useEmbedToken } from "../../use-embed-token";

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

const ATTRIBUTE_TO_TABLE_TITLE: Record<PerformanceAttribute, string> = {
  totalLeads: "Leads generated",
  totalConversions: "Conversions",
  totalSaleAmount: "Revenue generated",
  totalCommissions: "Commissions earned",
};

const ATTRIBUTE_TO_EVENT_PARAMS: Partial<
  Record<
    PerformanceAttribute,
    { event: "leads" | "sales"; saleType?: "new" | "recurring" }
  >
> = {
  totalLeads: { event: "leads" },
  totalConversions: { event: "leads", saleType: "new" },
  totalSaleAmount: { event: "sales" },
};

const ATTRIBUTE_TO_ANALYTICS_FIELD: Partial<
  Record<PerformanceAttribute, "leads" | "sales" | "saleAmount">
> = {
  totalLeads: "leads",
  totalConversions: "leads",
  totalSaleAmount: "sales",
};

const ATTRIBUTE_TO_CHART_FIELD: Partial<
  Record<PerformanceAttribute, "leads" | "sales" | "saleAmount">
> = {
  totalLeads: "leads",
  totalConversions: "leads",
  totalSaleAmount: "saleAmount",
};

const PAGE_SIZE = 10;

export function EmbedBountyPerformanceSection({
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
          <EmbedBountyPerformanceChart bounty={bounty} />
        </div>
      </div>
      <EmbedBountyPerformanceTable bounty={bounty} />
    </div>
  );
}

function EmbedBountyPerformanceChart({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const token = useEmbedToken();
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;
  const isCurrency = attribute ? isCurrencyAttribute(attribute) : false;
  const isCommissions = attribute === "totalCommissions";

  const startDate = useMemo(() => new Date(bounty.startsAt), [bounty.startsAt]);
  const endDate = useMemo(
    () => (bounty.endsAt ? new Date(bounty.endsAt) : new Date()),
    [bounty.endsAt],
  );

  const analyticsUrl = useMemo(() => {
    const eventParam = attribute
      ? ATTRIBUTE_TO_EVENT_PARAMS[attribute]
      : undefined;
    const params = new URLSearchParams({
      event: "composite",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      ...(eventParam?.saleType && { saleType: eventParam.saleType }),
    });
    return `/api/embed/referrals/analytics?${params.toString()}`;
  }, [startDate, endDate, attribute]);

  const { data: analyticsTimeseries, error } = useSWR<any[]>(
    analyticsUrl,
    (url) =>
      fetcher(url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    { keepPreviousData: true },
  );

  const data = useMemo(() => {
    if (!analyticsTimeseries) return undefined;

    if (isCommissions) {
      return analyticsTimeseries.map(
        ({ start, earnings }: { start: string; earnings: number }) => ({
          date: new Date(start),
          values: { main: earnings },
        }),
      );
    }

    if (!attribute) return [];

    const field = ATTRIBUTE_TO_CHART_FIELD[attribute];
    if (!field || !Array.isArray(analyticsTimeseries)) return [];

    return analyticsTimeseries.map((d: Record<string, any>) => ({
      date: new Date(d.start),
      values: { main: d[field] ?? 0 },
    }));
  }, [analyticsTimeseries, isCommissions, attribute]);

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

function EmbedBountyPerformanceTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;

  if (attribute === "totalCommissions") {
    return <EmbedBountyCommissionsTable bounty={bounty} />;
  }

  return <EmbedBountyEventsTable bounty={bounty} />;
}

function EmbedBountyEventsTable({ bounty }: { bounty: PartnerBountyProps }) {
  const token = useEmbedToken();
  const [page, setPage] = useState(1);

  const { pagination, setPagination } = useTablePagination({
    pageSize: PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const attribute = bounty.performanceCondition
    ?.attribute as PerformanceAttribute;
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

  const startDate = useMemo(() => new Date(bounty.startsAt), [bounty.startsAt]);
  const endDate = useMemo(
    () => (bounty.endsAt ? new Date(bounty.endsAt) : new Date()),
    [bounty.endsAt],
  );

  const eventsUrl = useMemo(() => {
    if (!eventParams) return null;
    const params = new URLSearchParams({
      event: eventParams.event,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      limit: String(PAGE_SIZE),
      page: String(page),
      ...(eventParams.saleType && { saleType: eventParams.saleType }),
    });
    return `/api/embed/referrals/events?${params.toString()}`;
  }, [eventParams, startDate, endDate, page]);

  const countUrl = useMemo(() => {
    if (!eventParams || !attribute) return null;
    const analyticsField = ATTRIBUTE_TO_ANALYTICS_FIELD[attribute];
    if (!analyticsField) return null;
    const params = new URLSearchParams({
      event: "composite",
      groupBy: "count",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      ...(eventParams.saleType && { saleType: eventParams.saleType }),
    });
    return `/api/embed/referrals/analytics?${params.toString()}`;
  }, [eventParams, attribute, startDate, endDate]);

  const authFetcher = (url: string) =>
    fetcher(url, { headers: { Authorization: `Bearer ${token}` } });

  const {
    data: events,
    isValidating: isLoading,
    error,
  } = useSWR<(LeadEvent | SaleEvent)[]>(eventsUrl, authFetcher, {
    keepPreviousData: true,
  });

  const { data: analyticsCount } = useSWR<Record<string, number>>(
    countUrl,
    authFetcher,
    { keepPreviousData: true },
  );

  const rows = useMemo<PerformanceRow[]>(() => {
    if (!events) return [];
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
  const eventsCount =
    analyticsField && analyticsCount ? analyticsCount[analyticsField] : 0;

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
    onPaginationChange: setPagination,
    rowCount: eventsCount,
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
        className="border-none md:min-h-0"
      />
    ),
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
        {tableTitle}
      </h2>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-neutral-200"
        scrollWrapperClassName="min-h-[315px]"
      />
    </div>
  );
}

function EmbedBountyCommissionsTable({
  bounty,
}: {
  bounty: PartnerBountyProps;
}) {
  const token = useEmbedToken();
  const [page, setPage] = useState(1);

  const { pagination, setPagination } = useTablePagination({
    pageSize: PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const startDate = useMemo(() => new Date(bounty.startsAt), [bounty.startsAt]);
  const endDate = useMemo(
    () => (bounty.endsAt ? new Date(bounty.endsAt) : new Date()),
    [bounty.endsAt],
  );

  const authFetcher = (url: string) =>
    fetcher(url, { headers: { Authorization: `Bearer ${token}` } });

  const earningsUrl = useMemo(() => {
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      page: String(page),
    });
    return `/api/embed/referrals/earnings?${params.toString()}`;
  }, [startDate, endDate, page]);

  const countUrl = useMemo(() => {
    const params = new URLSearchParams({
      event: "composite",
      groupBy: "count",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
    return `/api/embed/referrals/analytics?${params.toString()}`;
  }, [startDate, endDate]);

  const {
    data: earnings,
    isLoading,
    error,
  } = useSWR<
    {
      id: string;
      createdAt: string;
      earnings: number;
      customer: { id: string; email: string } | null;
      link: { id: string; shortLink: string; url: string } | null;
    }[]
  >(earningsUrl, authFetcher, {
    keepPreviousData: true,
  });

  const { data: countData, isLoading: isLoadingCount } = useSWR<
    Record<string, number>
  >(countUrl, authFetcher, { keepPreviousData: true });

  const rows = useMemo<PerformanceRow[]>(
    () =>
      earnings?.map((e) => ({
        id: e.id,
        date: e.createdAt,
        customer: e.customer,
        link: e.link ?? null,
        amount: e.earnings,
      })) ?? [],
    [earnings],
  );

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
    loading: isLoading || isLoadingCount,
    error: error ? "Failed to fetch data." : undefined,
    columns,
    pagination,
    onPaginationChange: setPagination,
    rowCount: countData?.sales ?? 0,
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
        className="border-none md:min-h-0"
      />
    ),
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-content-emphasis text-lg font-semibold leading-7 tracking-[-0.36px]">
        Commissions earned
      </h2>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-neutral-200"
        scrollWrapperClassName="min-h-[315px]"
      />
    </div>
  );
}
