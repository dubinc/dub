"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { CustomerProps, LinkProps, PartnerEarningsResponse } from "@/lib/types";
import FilterButton from "@/ui/analytics/events/filter-button";
import { LinkIcon } from "@/ui/links/link-icon";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { CommissionTypeBadge } from "@/ui/partners/commission-type-badge";
import { SaleStatusBadges } from "@/ui/partners/sale-status-badges";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  CopyText,
  Filter,
  LinkLogo,
  StatusBadge,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { CircleDollar, Hyperlink, Sliders, User } from "@dub/ui/icons";
import {
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDate,
  formatDateTime,
  getApexDomain,
  getPrettyUrl,
  linkConstructor,
} from "@dub/utils";
import { Cell } from "@tanstack/react-table";
import { useMemo } from "react";
import useSWR from "swr";
import { EarningsCompositeChart } from "./earnings-composite-chart";

type ColumnMeta = {
  filterParams?: (
    args: Pick<Cell<PartnerEarningsResponse, any>, "getValue">,
  ) => Record<string, any>;
};

export function EarningsTablePartner({
  limit,
  withChart,
}: {
  limit?: number;
  withChart?: boolean;
}) {
  const { programEnrollment } = useProgramEnrollment();
  const { queryParams, searchParamsObj, getQueryString } = useRouterStuff();

  const { sortBy = "createdAt", sortOrder = "desc" } = searchParamsObj as {
    sortBy?: "createdAt";
    sortOrder?: "asc" | "desc";
  };

  const { data: earningsCount } = useSWR<{ count: number }>(
    programEnrollment &&
      `/api/partner-profile/programs/${programEnrollment.programId}/earnings/count${getQueryString()}`,
    fetcher,
  );

  const {
    data: earnings,
    isLoading,
    error,
  } = useSWR<PartnerEarningsResponse[]>(
    programEnrollment &&
      `/api/partner-profile/programs/${programEnrollment.programId}/earnings${getQueryString()}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination(limit);

  const { table, ...tableProps } = useTable({
    data: earnings?.slice(0, limit) || [],
    loading: isLoading,
    error: error ? "Failed to fetch earnings." : undefined,
    columns: [
      {
        id: "createdAt",
        header: "Date",
        accessorKey: "timestamp",
        cell: ({ row }) => (
          <p title={formatDateTime(row.original.createdAt)}>
            {formatDate(row.original.createdAt, { month: "short" })}
          </p>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        meta: {
          filterParams: ({ getValue }) => ({
            type: getValue(),
          }),
        },
        cell: ({ row }) => <CommissionTypeBadge type={row.original.type} />,
      },
      {
        id: "link",
        header: "Link",
        accessorKey: "link",
        meta: {
          filterParams: ({ getValue }) => ({
            linkId: getValue().id,
          }),
        },
        cell: ({ row }) => (
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
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        meta: {
          filterParams: ({ getValue }) => ({
            customerId: getValue().id,
          }),
        },
        cell: ({ row }) =>
          row.original.customer ? row.original.customer.email : "-",
      },
      {
        id: "amount",
        header: "Sale Amount",
        accessorKey: "amount",
        cell: ({ row }) =>
          row.original.amount
            ? currencyFormatter(row.original.amount / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
      },
      {
        id: "earnings",
        header: "Earnings",
        accessorKey: "earnings",
        cell: ({ row }) =>
          currencyFormatter(row.original.earnings / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = SaleStatusBadges[row.original.status];

          return (
            <StatusBadge icon={null} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          );
        },
      },
    ],
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
      return (
        meta?.filterParams && <FilterButton set={meta.filterParams(cell)} />
      );
    },
    ...(!limit && {
      pagination,
      onPaginationChange: setPagination,
      sortableColumns: ["createdAt", "amount", "earnings"],
      sortBy,
      sortOrder,
      onSortChange: ({ sortBy, sortOrder }) =>
        queryParams({
          set: {
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
          },
        }),
    }),
    rowCount: earningsCount?.count || 0,
    emptyState: (
      <AnimatedEmptyState
        title="No earnings found"
        description="No earnings have been made for this program yet."
        cardContent={() => (
          <>
            <CircleDollar className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
      />
    ),
    resourceName: (plural) => `earning${plural ? "s" : ""}`,
  });

  return (
    <div className="flex flex-col gap-6">
      {!limit && <EarningsTableControls />}
      {withChart && <EarningsCompositeChart />}
      {isLoading || earnings?.length ? (
        <Table
          {...tableProps}
          table={table}
          containerClassName="border-neutral-300"
        />
      ) : (
        <AnimatedEmptyState
          title="No earnings found"
          description="No earnings have been made for this program yet."
          cardContent={() => (
            <>
              <CircleDollar className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function EarningsTableControls() {
  const { queryParams, searchParamsObj } = useRouterStuff();

  // TODO: Fetch links and customers
  const links = [] as LinkProps[];
  const customers = [] as CustomerProps[];

  const filters = useMemo(
    () => [
      {
        key: "type",
        icon: Sliders,
        label: "Type",
        options: ["click", "lead", "sale"].map((slug) => ({
          value: slug,
          label: capitalize(slug) as string,
          icon: <CommissionTypeIcon type={slug} />,
        })),
      },
      {
        key: "linkId",
        icon: Hyperlink,
        label: "Link",
        getOptionIcon: (value, props) => {
          const url = props.option?.data?.url;
          const [domain, key] = value.split("/");

          return <LinkIcon url={url} domain={domain} linkKey={key} />;
        },
        options:
          links?.map(({ id, domain, key }) => ({
            value: id,
            label: linkConstructor({ domain, key, pretty: true }),
          })) ?? null,
      },
      {
        key: "customerId",
        icon: User,
        label: "Customer",
        options:
          customers?.map(({ id, name, email }) => ({
            value: id,
            label: name || email || "-",
          })) ?? null,
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { type, linkId, customerId } = searchParamsObj;
    return [
      ...(type ? [{ key: "type", value: type }] : []),
      ...(linkId ? [{ key: "linkId", value: linkId }] : []),
      ...(customerId ? [{ key: "customerId", value: customerId }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string, value: any) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["type", "linkId", "customerId"],
    });

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <Filter.Select
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          // onSearchChange={setSearch}
          // onSelectedFilterChange={setSelectedFilter}
          // emptyState={{
          //   domain: (
          //     <div className="flex flex-col items-center gap-2 p-2 text-center text-sm">
          //       <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          //         <Globe className="size-6 text-neutral-700" />
          //       </div>
          //       <p className="mt-2 font-medium text-neutral-950">
          //         No domains found
          //       </p>
          //       <p className="mx-auto mt-1 w-full max-w-[180px] text-neutral-700">
          //         Add a custom domain to match your brand
          //       </p>
          //       <div>
          //         <Button
          //           className="mt-1 h-8"
          //           onClick={() => router.push(`/${slug}/settings/domains`)}
          //           text="Add domain"
          //         />
          //       </div>
          //     </div>
          //   ),
          // }}
        />
        <SimpleDateRangePicker
          className="w-full sm:min-w-[200px] md:w-fit"
          align="start"
        />
      </div>

      <div
        className={cn(
          "transition-[height] duration-[300ms]",
          activeFilters.length ? "h-3" : "h-0",
        )}
      />
      <Filter.List
        filters={filters}
        activeFilters={activeFilters}
        onRemove={onRemove}
        onRemoveAll={onRemoveAll}
      />
    </div>
  );
}
