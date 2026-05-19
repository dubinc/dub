"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { submittedLeadSchema } from "@/lib/zod/schemas/submitted-leads";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Filter,
  StatusBadge,
  Table,
  TimestampTooltip,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { cn, fetcher, formatDate, OG_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import * as z from "zod/v4";
import { useProgramSubmittedLeadsCount } from "../../lib/swr/use-program-submitted-leads-count";
import { SubmittedLeadSheet } from "./submitted-lead-sheet";
import { SubmittedLeadStatusBadges } from "./submitted-lead-status-badges";
import { getCompanyLogoUrl } from "./submitted-lead-utils";
import { useProgramSubmittedLeadFilters } from "./use-program-submitted-lead-filters";

type SubmittedLeadItem = z.infer<typeof submittedLeadSchema>;

export function SubmittedLeadTable() {
  const { getQueryString, queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const leadIdFromUrl = searchParams.get("leadId");

  const [detailsSheetState, setDetailsSheetState] = useState<{
    leadId: string | null;
    open: boolean;
  }>({
    leadId: leadIdFromUrl,
    open: !!leadIdFromUrl,
  });

  const { data: leadsCount, error: countError } =
    useProgramSubmittedLeadsCount();

  const {
    data: leads,
    error,
    isLoading,
  } = useSWR<SubmittedLeadItem[]>(
    `/api/programs/${defaultProgramId}/submitted-leads${getQueryString({
      workspaceId,
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const leadsColumns = {
    all: ["lead", "company", "partner", "submitted", "status"],
    defaultVisible: ["lead", "company", "partner", "submitted", "status"],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partner-submitted-leads-table-columns",
    leadsColumns,
  );

  const columns = [
    {
      id: "lead",
      header: "Lead",
      enableHiding: false,
      minSize: 250,
      cell: ({ row }: { row: Row<SubmittedLeadItem> }) => {
        const lead = row.original;
        const companyLogoUrl = getCompanyLogoUrl(lead.email);

        return (
          <div className="flex items-center gap-2 truncate">
            <img
              alt={lead.email}
              src={companyLogoUrl || `${OG_AVATAR_URL}${lead.id}`}
              className="size-5 shrink-0 rounded-full border border-neutral-200"
            />
            <span className="truncate" title={lead.email}>
              {lead.email}
            </span>
          </div>
        );
      },
    },
    {
      id: "company",
      header: "Company",
      accessorKey: "company",
      minSize: 150,
      cell: ({ row }: { row: Row<SubmittedLeadItem> }) => {
        return (
          <span className="min-w-0 truncate" title={row.original.company}>
            {row.original.company}
          </span>
        );
      },
    },
    {
      id: "partner",
      header: "Partner",
      minSize: 200,
      cell: ({ row }: { row: Row<SubmittedLeadItem> }) => {
        return (
          <PartnerRowItem
            partner={row.original.partner}
            showPermalink={true}
            showFraudIndicator={false}
          />
        );
      },
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: ({ row }: { row: Row<SubmittedLeadItem> }) => (
        <TimestampTooltip
          timestamp={row.original.createdAt}
          rows={["local"]}
          side="left"
          delayDuration={150}
        >
          <span>{formatDate(row.original.createdAt, { month: "short" })}</span>
        </TimestampTooltip>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: { row: Row<SubmittedLeadItem> }) => {
        const status = row.original.status;
        const badge = SubmittedLeadStatusBadges[status];

        return (
          <StatusBadge
            variant={badge.variant}
            icon={null}
            className={cn("border-0", badge.className)}
          >
            {badge.label}
          </StatusBadge>
        );
      },
    },
  ].filter((c) => leadsColumns.all.includes(c.id));

  const { table, ...tableProps } = useTable({
    data: leads || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `submitted lead${p ? "s" : ""}`,
    rowCount: leadsCount || 0,
    loading: isLoading,
    error: error || countError ? "Failed to load submitted leads" : undefined,
    onRowClick: (row) => {
      queryParams({
        set: { leadId: row.original.id },
        scroll: false,
      });
      setDetailsSheetState({
        leadId: row.original.id,
        open: true,
      });
    },
  });

  const currentLead = useMemo(() => {
    if (!leads || !detailsSheetState.leadId) return null;
    return leads.find((l) => l.id === detailsSheetState.leadId) || null;
  }, [leads, detailsSheetState.leadId]);

  const [previousLeadId, nextLeadId] = useMemo(() => {
    if (!leads || !detailsSheetState.leadId) return [null, null];

    const currentIndex = leads.findIndex(
      ({ id }) => id === detailsSheetState.leadId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? leads[currentIndex - 1].id : null,
      currentIndex < leads.length - 1 ? leads[currentIndex + 1].id : null,
    ];
  }, [leads, detailsSheetState.leadId]);

  // Sync state with URL params
  useEffect(() => {
    const urlLeadId = searchParams.get("leadId");
    if (urlLeadId && urlLeadId !== detailsSheetState.leadId) {
      setDetailsSheetState({
        leadId: urlLeadId,
        open: true,
      });
    } else if (!urlLeadId && detailsSheetState.leadId) {
      setDetailsSheetState({
        leadId: null,
        open: false,
      });
    }
  }, [searchParams, detailsSheetState.leadId]);

  return (
    <div className="flex flex-col gap-3">
      {detailsSheetState.leadId && currentLead && (
        <SubmittedLeadSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          lead={currentLead}
          onPrevious={
            previousLeadId
              ? () => {
                  queryParams({
                    set: { leadId: previousLeadId },
                    scroll: false,
                  });
                  setDetailsSheetState({
                    leadId: previousLeadId,
                    open: true,
                  });
                }
              : undefined
          }
          onNext={
            nextLeadId
              ? () => {
                  queryParams({
                    set: { leadId: nextLeadId },
                    scroll: false,
                  });
                  setDetailsSheetState({
                    leadId: nextLeadId,
                    open: true,
                  });
                }
              : undefined
          }
        />
      )}
      <div>
        <SubmittedLeadFilters />
      </div>
      {leads?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No leads submitted"
          description="Allow partners to submit leads and track their progress through the sales process."
          learnMoreHref="https://dub.co/help/article/partner-rewards"
          cardContent={
            <>
              <div className="bg-bg-emphasis h-2.5 w-24 min-w-0 rounded-sm" />
            </>
          }
        />
      )}
    </div>
  );
}

function SubmittedLeadFilters() {
  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    setSearch,
    setSelectedFilter,
  } = useProgramSubmittedLeadFilters({});

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filter.Select
          className="w-full md:w-fit"
          filters={filters}
          activeFilters={activeFilters}
          onSelect={onSelect}
          onRemove={onRemove}
          onSearchChange={setSearch}
          onSelectedFilterChange={setSelectedFilter}
        />
        <SearchBoxPersisted
          placeholder="Search by email or name"
          inputClassName="md:w-[16rem]"
        />
      </div>
      <AnimatedSizeContainer height>
        <div>
          {activeFilters.length > 0 && (
            <div className="pt-3">
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            </div>
          )}
        </div>
      </AnimatedSizeContainer>
    </>
  );
}
