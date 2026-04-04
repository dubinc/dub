"use client";

import { formatDateTooltip } from "@/lib/analytics/format-date-tooltip";
import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES } from "@/lib/bounty/api/performance-bounty-scope-attributes";
import {
  LeadEvent,
  PartnerBountyProps,
  ProgramEnrollmentProps,
  SaleEvent,
} from "@/lib/types";
import { CustomerRowItem } from "@/ui/customers/customer-row-item";
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
import { useReferralsEmbedData } from "../page-client";
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
  programEnrollment,
}: {
  bounty: PartnerBountyProps;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt">;
}) {
  const { themeOptions } = useReferralsEmbedData();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-content-emphasis text-sm font-semibold">
          Performance
        </h2>
        <div
          style={{
            backgroundColor: themeOptions.backgroundColor || "transparent",
          }}
          className="border-border-subtle bg-bg-default rounded-xl border p-5"
        >
          <EmbedBountyPerformanceChart
            bounty={bounty}
            programEnrollment={programEnrollment}
          />
        </div>
      </div>
      <EmbedBountyPerformanceTable
        bounty={bounty}
        programEnrollment={programEnrollment}
      />
    </div>
  );
}

function EmbedBountyPerformanceChart({
  bounty,
  programEnrollment,
}: {
  bounty: PartnerBountyProps;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt">;
}) {
  const token = useEmbedToken();
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;
  const isCurrency = attribute ? isCurrencyAttribute(attribute) : false;
  const isCommissions = attribute === "totalCommissions";

  const startDate = useMemo(
    () =>
      bounty.performanceScope === "new"
        ? new Date(bounty.startsAt)
        : new Date(programEnrollment.createdAt ?? bounty.startsAt),
    [bounty.performanceScope, bounty.startsAt, programEnrollment.createdAt],
  );
  const endDate = useMemo(
    () => (bounty.endsAt ? new Date(bounty.endsAt) : new Date()),
    [bounty.endsAt],
  );
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const authFetcher = (url: string) =>
    fetcher(url, { headers: { Authorization: `Bearer ${token}` } });

  const analyticsUrl = useMemo(() => {
    const eventParam = attribute
      ? ATTRIBUTE_TO_EVENT_PARAMS[attribute]
      : undefined;
    const params = new URLSearchParams({
      event: "composite",
      groupBy: "timeseries",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      ...(eventParam?.saleType && { saleType: eventParam.saleType }),
    });
    return `/api/embed/referrals/analytics?${params.toString()}`;
  }, [startDate, endDate, attribute]);

  const earningsTimeseriesUrl = useMemo(() => {
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      timezone,
    });
    return `/api/embed/referrals/earnings/timeseries?${params.toString()}`;
  }, [startDate, endDate, timezone]);

  const { data: analyticsTimeseries, error: analyticsError } = useSWR<any[]>(
    isCommissions ? null : analyticsUrl,
    authFetcher,
    { keepPreviousData: true },
  );

  const { data: earningsTimeseries, error: earningsError } = useSWR<
    { start: string; earnings: number }[]
  >(isCommissions ? earningsTimeseriesUrl : null, authFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const data = useMemo(() => {
    if (isCommissions) {
      if (!earningsTimeseries) {
        return undefined;
      }

      if (!Array.isArray(earningsTimeseries)) {
        return [];
      }

      return earningsTimeseries.map(({ start, earnings }) => ({
        date: new Date(start),
        values: { main: earnings },
      }));
    }

    if (!analyticsTimeseries) {
      return undefined;
    }

    if (!attribute) return [];

    const field = ATTRIBUTE_TO_CHART_FIELD[attribute];
    if (!field || !Array.isArray(analyticsTimeseries)) return [];

    return analyticsTimeseries.map((d: Record<string, any>) => ({
      date: new Date(d.start),
      values: { main: d[field] ?? 0 },
    }));
  }, [analyticsTimeseries, earningsTimeseries, isCommissions, attribute]);

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
              colorClassName: "text-[var(--brand,#8e51ff)]",
              isActive: true,
            },
          ]}
          tooltipContent={(d) => (
            <div className="flex justify-between gap-6 whitespace-nowrap p-2 text-xs leading-none">
              <span className="text-content-default font-medium">
                {formatDateTooltip(d.date, {})}
              </span>
              <p className="text-content-subtle text-right">
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
            <span className="text-content-subtle text-sm">
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
  programEnrollment,
}: {
  bounty: PartnerBountyProps;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt">;
}) {
  const attribute = bounty.performanceCondition?.attribute as
    | PerformanceAttribute
    | undefined;

  if (attribute === "totalCommissions") {
    return (
      <EmbedBountyCommissionsTable
        bounty={bounty}
        programEnrollment={programEnrollment}
      />
    );
  }

  return (
    <EmbedBountyEventsTable
      bounty={bounty}
      programEnrollment={programEnrollment}
    />
  );
}

function EmbedBountyEventsTable({
  bounty,
  programEnrollment,
}: {
  bounty: PartnerBountyProps;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt">;
}) {
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

  const eventParams = attribute
    ? ATTRIBUTE_TO_EVENT_PARAMS[attribute]
    : undefined;

  const startDate = useMemo(
    () =>
      bounty.performanceScope === "new"
        ? new Date(bounty.startsAt)
        : new Date(programEnrollment.createdAt ?? bounty.startsAt),
    [bounty.performanceScope, bounty.startsAt, programEnrollment.createdAt],
  );
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
                <span
                  className="text-content-default truncate"
                  title={row.original.link.shortLink}
                >
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
      <div className="text-content-subtle text-sm">
        No {metricLabel} recorded yet
      </div>
    ),
    emptyWrapperClassName: "h-48",
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-content-emphasis text-sm font-semibold leading-7 tracking-[-0.36px]">
        {tableTitle}
      </h2>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-border-subtle"
        scrollWrapperClassName="min-h-[315px]"
      />
    </div>
  );
}

function EmbedBountyCommissionsTable({
  bounty,
  programEnrollment,
}: {
  bounty: PartnerBountyProps;
  programEnrollment: Pick<ProgramEnrollmentProps, "createdAt">;
}) {
  const token = useEmbedToken();
  const [page, setPage] = useState(1);

  const { pagination, setPagination } = useTablePagination({
    pageSize: PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const startDate = useMemo(
    () =>
      bounty.performanceScope === "new"
        ? new Date(bounty.startsAt)
        : new Date(programEnrollment.createdAt ?? bounty.startsAt),
    [bounty.performanceScope, bounty.startsAt, programEnrollment.createdAt],
  );
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
      pageSize: String(PAGE_SIZE),
      withTotal: "true",
    });
    return `/api/embed/referrals/earnings?${params.toString()}`;
  }, [startDate, endDate, page]);

  const {
    data: earningsResponse,
    isLoading,
    error,
  } = useSWR<{
    data: {
      id: string;
      createdAt: string;
      earnings: number;
      customer: { id: string; email: string } | null;
      link: { id: string; shortLink: string; url: string } | null;
    }[];
    total: number;
  }>(earningsUrl, authFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const rows = useMemo<PerformanceRow[]>(
    () =>
      earningsResponse?.data.map((e) => ({
        id: e.id,
        date: e.createdAt,
        customer: e.customer,
        link: e.link ?? null,
        amount: e.earnings,
      })) ?? [],
    [earningsResponse],
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
    loading: isLoading,
    error: error ? "Failed to fetch data." : undefined,
    columns,
    pagination,
    onPaginationChange: setPagination,
    rowCount: earningsResponse?.total ?? 0,
    thClassName: "border-l-transparent",
    tdClassName: (columnId: string) =>
      cn("border-l-transparent", columnId === "customer" && "p-0"),
    resourceName: () => "commissions",
    emptyState: (
      <div className="text-content-subtle text-sm">
        No commissions recorded yet
      </div>
    ),
    emptyWrapperClassName: "h-48",
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-content-emphasis text-sm font-semibold leading-7 tracking-[-0.36px]">
        Commissions earned
      </h2>
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-border-subtle"
        scrollWrapperClassName="min-h-[315px]"
      />
    </div>
  );
}
