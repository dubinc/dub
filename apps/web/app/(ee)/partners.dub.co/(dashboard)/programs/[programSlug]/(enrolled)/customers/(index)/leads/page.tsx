"use client";

import { usePartnerSubmittedLeads } from "@/lib/swr/use-partner-submitted-leads";
import { usePartnerSubmittedLeadsCount } from "@/lib/swr/use-partner-submitted-leads-count";
import { PartnerProfileSubmittedLeadsCountByStatus } from "@/lib/types";
import { PartnerProfileSubmittedLead } from "@/lib/zod/schemas/partner-profile";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PartnerProfileSubmittedLeadSheet } from "@/ui/submitted-leads/partner-profile-submitted-lead-sheet";
import { PartnerProfileSubmittedLeadsEmptyState } from "@/ui/submitted-leads/partner-profile-submitted-leads-empty-state";
import { SubmittedLeadStatusBadges } from "@/ui/submitted-leads/submitted-lead-status-badges";
import { getCompanyLogoUrl } from "@/ui/submitted-leads/submitted-lead-utils";
import { SubmittedLeadStatus } from "@dub/prisma/client";
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
import { CircleDotted } from "@dub/ui/icons";
import { cn, formatDate, nFormatter, OG_AVATAR_URL } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

export default function PartnerProgramSubmittedLeadsPage() {
  const { queryParams, searchParams } = useRouterStuff();
  const { pagination, setPagination } = usePagination();

  const leadIdFromUrl = searchParams.get("leadId");

  const [detailsSheetState, setDetailsSheetState] = useState<{
    leadId: string | null;
    open: boolean;
  }>({
    leadId: leadIdFromUrl,
    open: !!leadIdFromUrl,
  });

  const { searchParamsObj } = useRouterStuff();
  const status = searchParamsObj.status as SubmittedLeadStatus | undefined;
  const search = searchParamsObj.search as string | undefined;

  const { data: countByStatus } = usePartnerSubmittedLeadsCount<
    PartnerProfileSubmittedLeadsCountByStatus[] | undefined
  >({
    query: {
      groupBy: "status",
    },
  });

  const { data: totalCount, error: countError } =
    usePartnerSubmittedLeadsCount<number>({
      query: {
        ...(status && { status }),
        ...(search && { search }),
      },
    });

  const { data: leads, error, isLoading } = usePartnerSubmittedLeads();

  const leadsColumns = {
    all: ["lead", "name", "company", "submitted", "status"],
    defaultVisible: ["lead", "name", "company", "submitted", "status"],
  };

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "partner-profile-leads-table-columns",
    leadsColumns,
  );

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options:
          countByStatus?.map(({ status, _count }) => {
            const badge = SubmittedLeadStatusBadges[status];
            const Icon = badge.icon;

            return {
              value: status,
              label: badge.label,
              icon: (
                <Icon
                  className={cn(badge.className, "size-4 bg-transparent")}
                />
              ),
              right: nFormatter(_count, { full: true }),
            };
          }) ?? [],
        meta: {
          filterParams: ({ getValue }: { getValue: () => string }) => ({
            status: getValue(),
          }),
        },
      },
    ],
    [countByStatus],
  );

  const activeFilters = useMemo(() => {
    return [...(status ? [{ key: "status", value: status }] : [])];
  }, [status]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
    });

  const onRemove = (key: string) =>
    queryParams({
      del: [key, "page"],
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "search"],
    });

  const columns = useMemo(
    () =>
      [
        {
          id: "lead",
          header: "Lead",
          enableHiding: false,
          minSize: 250,
          cell: ({ row }: { row: Row<PartnerProfileSubmittedLead> }) => {
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
          id: "name",
          header: "Name",
          accessorKey: "name",
          minSize: 150,
          cell: ({ row }: { row: Row<PartnerProfileSubmittedLead> }) => {
            return (
              <span className="min-w-0 truncate" title={row.original.name}>
                {row.original.name}
              </span>
            );
          },
        },
        {
          id: "company",
          header: "Company",
          accessorKey: "company",
          minSize: 150,
          cell: ({ row }: { row: Row<PartnerProfileSubmittedLead> }) => {
            return (
              <span className="min-w-0 truncate" title={row.original.company}>
                {row.original.company}
              </span>
            );
          },
        },
        {
          id: "submitted",
          header: "Submitted",
          cell: ({ row }: { row: Row<PartnerProfileSubmittedLead> }) => (
            <TimestampTooltip
              timestamp={row.original.createdAt}
              rows={["local"]}
              side="left"
              delayDuration={150}
            >
              <span>
                {formatDate(row.original.createdAt, { month: "short" })}
              </span>
            </TimestampTooltip>
          ),
        },
        {
          id: "status",
          header: "Status",
          accessorKey: "status",
          cell: ({ row }: { row: Row<PartnerProfileSubmittedLead> }) => {
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
      ].filter((c) => leadsColumns.all.includes(c.id)),
    [],
  );

  const { table, ...tableProps } = useTable({
    data: leads || [],
    columns,
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `lead${p ? "s" : ""}`,
    rowCount: totalCount || 0,
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
        <PartnerProfileSubmittedLeadSheet
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
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
      </div>
      {leads && leads.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : !isLoading ? (
        <PartnerProfileSubmittedLeadsEmptyState />
      ) : null}
    </div>
  );
}
