"use client";

import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import usePartner from "@/lib/swr/use-partner";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, PartnerPlatformProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerApplicationSheet } from "@/ui/partners/partner-application-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerSocialColumn } from "@/ui/partners/partner-social-column";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PlatformType } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  EditColumnsButton,
  Filter,
  MenuItem,
  Popover,
  Table,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Check, Dots, LoadingSpinner, Users } from "@dub/ui/icons";
import { COUNTRIES, fetcher, formatDate } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { usePartnerFilters } from "../../use-partner-filters";

const applicationsColumns = {
  all: [
    "partner",
    "createdAt",
    "location",
    "website",
    "youtube",
    "twitter",
    "linkedin",
    "instagram",
    "tiktok",
  ],
  defaultVisible: [
    "partner",
    "createdAt",
    "location",
    "website",
    "youtube",
    "linkedin",
  ],
};

export function ProgramPartnersRejectedApplicationsPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  } = usePartnerFilters({ sortBy, sortOrder, status: "rejected" }, ["country"]);

  const { partnersCount, error: countError } = usePartnersCount<number>({
    status: "rejected",
  });

  const {
    data: partners,
    error,
    isValidating,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString(
      {
        workspaceId,
        status: "rejected",
        sortBy,
        sortOrder,
        includePartnerPlatformPropss: true,
      },
      { exclude: ["partnerId"] },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const { groups } = useGroups();

  // Create a separate map for platform lookups by partner ID
  const platformsMapByPartnerId = useMemo(() => {
    const map = new Map<
      string,
      Record<PlatformType, PartnerPlatformProps | null>
    >();

    partners?.forEach((partner) => {
      if (partner.platforms) {
        map.set(partner.id, buildSocialPlatformLookup(partner.platforms));
      }
    });
    return map;
  }, [partners]);

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) setDetailsSheetState({ open: true, partnerId });
  }, [searchParams]);

  const { currentPartner, isLoading: isCurrentPartnerLoading } =
    useCurrentPartner({
      partners,
      partnerId: detailsSheetState.partnerId,
    });

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "applications-table-columns",
    applicationsColumns,
  );

  const { pagination, setPagination } = usePagination();

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Applicant",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original}
              showPermalink={false}
              showFraudIndicator={false}
            />
          );
        },
      },
      {
        id: "createdAt",
        header: "Applied",
        accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
      },
      {
        id: "group",
        header: "Group",
        enableHiding: false,
        minSize: 150,
        cell: ({ row }) => {
          if (!groups || !row.original.groupId) {
            return "-";
          }

          const partnerGroup = groups.find(
            (g) => g.id === row.original.groupId,
          );

          if (!partnerGroup) {
            return "-";
          }

          return (
            <div className="flex items-center gap-2">
              <GroupColorCircle group={partnerGroup} />
              <span className="truncate text-sm font-medium">
                {partnerGroup.name}
              </span>
            </div>
          );
        },
      },
      {
        id: "location",
        header: "Location",
        minSize: 150,
        cell: ({ row }) => {
          const country = row.original.country;
          return (
            <div className="flex items-center gap-2">
              {country && (
                <img
                  alt={`${country} flag`}
                  src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
                  className="size-4 shrink-0"
                />
              )}
              <span className="min-w-0 truncate">
                {(country ? COUNTRIES[country] : null) ?? "-"}
              </span>
            </div>
          );
        },
      },
      // Socials
      {
        id: "website",
        header: "Website",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.website}
              platformName="website"
            />
          );
        },
      },
      {
        id: "youtube",
        header: "YouTube",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.youtube}
              platformName="youtube"
            />
          );
        },
      },
      {
        id: "twitter",
        header: "X/Twitter",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.twitter}
              platformName="twitter"
            />
          );
        },
      },
      {
        id: "linkedin",
        header: "LinkedIn",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.linkedin}
              platformName="linkedin"
            />
          );
        },
      },
      {
        id: "instagram",
        header: "Instagram",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.instagram}
              platformName="instagram"
            />
          );
        },
      },
      {
        id: "tiktok",
        header: "TikTok",
        minSize: 150,
        cell: ({ row }: { row: Row<EnrolledPartnerProps> }) => {
          const platformsMap = platformsMapByPartnerId.get(row.original.id);

          return (
            <PartnerSocialColumn
              platform={platformsMap?.tiktok}
              platformName="tiktok"
            />
          );
        },
      },

      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        header: ({ table }) => <EditColumnsButton table={table} />,
        cell: ({ row }) => (
          <PartnerRowMenuButton row={row} workspaceId={workspaceId!} />
        ),
      },
    ],
    [workspaceId, groups, platformsMapByPartnerId],
  );

  const { table, ...tableProps } = useTable<EnrolledPartnerProps>({
    data: partners || [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row) => {
      queryParams({
        set: {
          partnerId: row.original.id,
        },
        scroll: false,
      });
    },
    pagination,
    onPaginationChange: setPagination,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    sortableColumns: ["createdAt"],
    sortBy,
    sortOrder,
    onSortChange: ({ sortBy, sortOrder }) =>
      queryParams({
        set: {
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
        del: "page",
        scroll: false,
      }),
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `application${p ? "s" : ""}`,
    rowCount: partnersCount || 0,
    loading: isValidating || isCurrentPartnerLoading,
    error: error || countError ? "Failed to load applications" : undefined,
  });

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!partners || !detailsSheetState.partnerId) return [null, null];

    const currentIndex = partners.findIndex(
      ({ id }) => id === detailsSheetState.partnerId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? partners[currentIndex - 1].id : null,
      currentIndex < partners.length - 1 ? partners[currentIndex + 1].id : null,
    ];
  }, [partners, detailsSheetState.partnerId]);

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.partnerId && currentPartner && (
        <PartnerApplicationSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
          onPrevious={
            previousPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: previousPartnerId },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: nextPartnerId },
                    scroll: false,
                  })
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
            placeholder="Search by name or email"
            inputClassName="md:w-72"
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
      {partners?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No rejected applications found"
          description={`No rejected applications found${isFiltered || search ? " for the selected filters" : " for this program"}.`}
          cardContent={() => (
            <>
              <Users className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function PartnerRowMenuButton({
  row,
  workspaceId,
}: {
  row: Row<EnrolledPartnerProps>;
  workspaceId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync: approvePartner, isPending: isApprovingPartner } =
    useAction(approvePartnerAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: () => {
        toast.success("Partner application approved");
        mutatePrefix(["/api/partners", "/api/partners/count"]);
      },
    });

  const {
    setShowConfirmModal: setShowApproveModal,
    confirmModal: approveModal,
  } = useConfirmModal({
    title: "Approve Application",
    description: "Are you sure you want to approve this application?",
    confirmText: "Approve",
    onConfirm: async () => {
      await approvePartner({
        workspaceId: workspaceId!,
        partnerId: row.original.id,
      });
    },
  });

  return (
    <>
      {approveModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1 text-sm sm:w-auto sm:min-w-[130px]">
              <MenuItem
                as={Command.Item}
                icon={Check}
                onSelect={() => {
                  setIsOpen(false);
                  setShowApproveModal(true);
                }}
              >
                Approve partner
              </MenuItem>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
          variant="outline"
          icon={
            isApprovingPartner ? (
              <LoadingSpinner className="size-4 shrink-0" />
            ) : (
              <Dots className="size-4 shrink-0" />
            )
          }
        />
      </Popover>
    </>
  );
}

/** Gets the current partner from the loaded partners array if available, or a separate fetch if not */
function useCurrentPartner({
  partners,
  partnerId,
}: {
  partners?: EnrolledPartnerProps[];
  partnerId: string | null;
}) {
  let currentPartner = partnerId
    ? partners?.find(({ id }) => id === partnerId)
    : null;

  const { partner: fetchedPartner, loading: isLoading } = usePartner(
    {
      partnerId: partners && partnerId && !currentPartner ? partnerId : null,
    },
    {
      keepPreviousData: true,
    },
  );

  if (!currentPartner && fetchedPartner?.id === partnerId) {
    currentPartner = fetchedPartner;
  }

  return { currentPartner, isLoading };
}
