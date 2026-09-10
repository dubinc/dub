"use client";

import { PlanProps, plans } from "@/lib/types";
import {
  ADMIN_RECENT_PROGRAMS_PAGE_SIZE,
  adminRecentProgramSchema,
} from "@/lib/zod/schemas/admin";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { FilterButtonTableRow } from "@/ui/shared/filter-button-table-row";
import PlanBadge from "@/ui/workspaces/plan-badge";
import {
  CreditCard,
  Filter,
  GridIcon,
  Table,
  TimestampTooltip,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  capitalize,
  cn,
  currencyFormatter,
  fetcher,
  formatDateSmart,
  getDomainWithoutWWW,
  isSafeLinkHref,
  nFormatter,
  OG_AVATAR_URL,
  PARTNERS_DOMAIN,
} from "@dub/utils";
import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

type AdminRecentProgram = z.infer<typeof adminRecentProgramSchema>;

export default function RecentProgramsPage() {
  return (
    <Suspense>
      <RecentProgramsPageClient />
    </Suspense>
  );
}

function RecentProgramsPageClient() {
  const { queryParams, getQueryString, searchParamsObj } = useRouterStuff();
  const { plan } = searchParamsObj;
  const { pagination, setPagination } = usePagination(
    ADMIN_RECENT_PROGRAMS_PAGE_SIZE,
  );
  const [programToAdd, setProgramToAdd] = useState<AdminRecentProgram | null>(
    null,
  );

  const filters = useMemo(
    () => [
      {
        key: "plan",
        icon: CreditCard,
        label: "Plan",
        singleSelect: true,
        options: plans.map((value) => ({
          value,
          label: capitalize(value) ?? value,
        })),
      },
    ],
    [],
  );

  const activeFilters = useMemo(
    () => [...(plan ? [{ key: "plan", value: plan }] : [])],
    [plan],
  );

  const onSelect = useCallback(
    (key: string, value: any) =>
      queryParams({
        set: { [key]: value },
        del: "page",
      }),
    [queryParams],
  );

  const onRemove = useCallback(
    (key: string) =>
      queryParams({
        del: [key, "page"],
      }),
    [queryParams],
  );

  const onRemoveAll = useCallback(
    () =>
      queryParams({
        del: ["plan", "page"],
      }),
    [queryParams],
  );

  const {
    data: { programs, total } = {},
    isLoading,
    mutate,
  } = useSWR<{
    programs: AdminRecentProgram[];
    total: number;
  }>(
    `/api/admin/programs/recent${getQueryString({
      pageSize: String(ADMIN_RECENT_PROGRAMS_PAGE_SIZE),
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Add marketplace program",
    description: programToAdd ? (
      <>
        Add{" "}
        <span className="font-medium text-neutral-900">
          {programToAdd.name}
        </span>{" "}
        to marketplace listings? This will make it visible to all partners on{" "}
        <a
          href="https://dub.co/marketplace"
          target="_blank"
          className="font-medium text-neutral-900 underline decoration-neutral-300 decoration-dotted underline-offset-2"
        >
          dub.co/marketplace
        </a>
      </>
    ) : null,
    confirmText: "Add",
    cancelText: "Cancel",
    onCancel: () => setProgramToAdd(null),
    onConfirm: async () => {
      if (!programToAdd) return;

      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          programSlug: programToAdd.slug,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || "Failed to add program.");
        throw new Error(message);
      }

      await mutate();
      toast.success("Program added to marketplace.");
      setProgramToAdd(null);
    },
  });

  const { table, ...tableProps } = useTable({
    data: programs ?? [],
    columns: [
      {
        id: "program",
        header: "Program",
        minSize: 280,
        cell: ({ row }) => (
          <ProgramCell
            program={row.original}
            onAddToMarketplace={() => {
              setProgramToAdd(row.original);
              setShowConfirmModal(true);
            }}
          />
        ),
      },
      {
        id: "plan",
        header: "Plan",
        minSize: 140,
        cell: ({ row }) => <PlanBadge plan={row.original.plan as PlanProps} />,
        meta: {
          filterParams: ({ row }) => ({
            plan: row.original.plan,
          }),
        },
      },
      {
        id: "partners",
        header: "Partners",
        minSize: 120,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {nFormatter(row.original.partners, { full: true })}
          </span>
        ),
      },
      {
        id: "commissions",
        header: "Commissions (30D)",
        minSize: 160,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {currencyFormatter(row.original.commissions, {
              trailingZeroDisplay: "stripIfInteger",
            })}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Created",
        minSize: 140,
        cell: ({ row }) => (
          <TimestampTooltip
            timestamp={row.original.createdAt}
            rows={["local", "utc", "unix"]}
            side="left"
          >
            <span className="cursor-default whitespace-nowrap tabular-nums text-neutral-600 underline decoration-neutral-300 decoration-dotted underline-offset-2">
              {formatDateSmart(row.original.createdAt, { month: "short" })}
            </span>
          </TimestampTooltip>
        ),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    resourceName: (plural) => `program${plural ? "s" : ""}`,
    rowCount: total ?? 0,
    loading: isLoading,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    cellRight: (cell) => {
      const meta = cell.column.columnDef.meta as
        | {
            filterParams?: any;
          }
        | undefined;

      return (
        meta?.filterParams && (
          <FilterButtonTableRow set={meta.filterParams(cell)} />
        )
      );
    },
  });

  return (
    <>
      {confirmModal}
      <div className="flex flex-col gap-3">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
        />
        {activeFilters.length > 0 && (
          <Filter.List
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveAll={onRemoveAll}
          />
        )}
        <Table {...tableProps} table={table} />
      </div>
    </>
  );
}

function ProgramCell({
  program,
  onAddToMarketplace,
}: {
  program: AdminRecentProgram;
  onAddToMarketplace: () => void;
}) {
  const programUrl =
    program.url && isSafeLinkHref(program.url)
      ? program.url
      : `${PARTNERS_DOMAIN}/${program.slug}`;
  const listedAt = program.addedToMarketplaceAt;

  const marketplaceIcon = (
    <GridIcon className="size-3.5 shrink-0" aria-hidden />
  );

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
      <img
        src={program.logo || `${OG_AVATAR_URL}${program.name}`}
        alt={program.name}
        width={20}
        height={20}
        className="size-4 rounded-full"
      />
      <span className="truncate text-sm font-medium">{program.name}</span>•
      <a
        className="truncate text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
        href={programUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {getDomainWithoutWWW(programUrl)}
      </a>
      {listedAt ? (
        <Tooltip
          content={
            <div className="max-w-[220px] px-3 py-2.5 text-center">
              <p className="text-sm font-medium text-neutral-900">
                Dub Marketplace
              </p>
              <p className="mt-1 text-xs leading-snug text-neutral-500">
                Listed since{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(listedAt))}
              </p>
              <p className="mt-2 text-xs font-medium text-teal-700">
                Click to open listing ↗
              </p>
            </div>
          }
        >
          <a
            href={`https://partners.dub.co/marketplace/${program.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
              "border border-teal-200/90 bg-gradient-to-br from-white to-teal-50/90",
              "text-teal-700 shadow-sm ring-1 ring-inset ring-white",
              "transition-[box-shadow,transform] duration-150 hover:shadow-md active:scale-[0.97]",
              "outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            )}
            aria-label={`View ${program.name} on Dub Marketplace (opens in new tab)`}
          >
            {marketplaceIcon}
          </a>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onAddToMarketplace}
          className={cn(
            "ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            "border border-neutral-200 bg-white text-neutral-400",
            "transition-[box-shadow,transform,color] duration-150",
            "hover:bg-neutral-50 hover:text-neutral-600 hover:shadow-sm active:scale-[0.97]",
            "outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          )}
          aria-label={`Add ${program.name} to Dub Marketplace`}
        >
          {marketplaceIcon}
        </button>
      )}
    </div>
  );
}
