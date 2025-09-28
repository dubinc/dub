"use client";

import { bulkRejectPartnersAction } from "@/lib/actions/partners/bulk-reject-partners";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import usePartner from "@/lib/swr/use-partner";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useBulkApprovePartnersModal } from "@/ui/partners/bulk-approve-partners-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerApplicationSheet } from "@/ui/partners/partner-application-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerSocialColumn } from "@/ui/partners/partner-social-column";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  Button,
  EditColumnsButton,
  MenuItem,
  Popover,
  Table,
  useColumnVisibility,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { Dots, LoadingSpinner, Users, UserXmark } from "@dub/ui/icons";
import {
  COUNTRIES,
  fetcher,
  formatDate,
  getDomainWithoutWWW,
  pluralize,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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

export function ProgramPartnersApplicationsPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { queryParams, searchParams, getQueryString } = useRouterStuff();

  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "saleAmount";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { partnersCount, error: countError } = usePartnersCount<number>({
    status: "pending",
  });

  const {
    data: partners,
    error,
    isValidating,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString(
      {
        workspaceId,
        status: "pending",
        sortBy: "createdAt",
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

  const { executeAsync: rejectPartners, isPending: isRejectingPartners } =
    useAction(bulkRejectPartnersAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: ({ input }) => {
        toast.success(
          `${pluralize("Partner", input.partnerIds.length)} rejected`,
        );
        mutatePrefix(["/api/partners", "/api/partners/count"]);
      },
    });

  // State for pending bulk actions
  const [pendingApprovePartners, setPendingApprovePartners] = useState<
    EnrolledPartnerProps[]
  >([]);

  const [pendingRejectIds, setPendingRejectIds] = useState<string[]>([]);

  const { setShowBulkApprovePartnersModal, BulkApprovePartnersModal } =
    useBulkApprovePartnersModal({
      partners: pendingApprovePartners,
    });

  const { setShowConfirmModal: setShowRejectModal, confirmModal: rejectModal } =
    useConfirmModal({
      title: "Reject Applications",
      description: "Are you sure you want to reject these applications?",
      confirmText: "Reject",
      onConfirm: async () => {
        if (pendingRejectIds.length > 0) {
          await rejectPartners({
            workspaceId: workspaceId!,
            partnerIds: pendingRejectIds,
          });
          setPendingRejectIds([]);
        }
      },
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
            <PartnerRowItem partner={row.original} showPermalink={false} />
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
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              value={getDomainWithoutWWW(row.original.website) ?? "-"}
              verified={!!row.original.websiteVerifiedAt}
            />
          );
        },
      },
      {
        id: "youtube",
        header: "YouTube",
        minSize: 150,
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              at
              value={row.original.youtube}
              verified={!!row.original.youtubeVerifiedAt}
            />
          );
        },
      },
      {
        id: "twitter",
        header: "X/Twitter",
        minSize: 150,
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              at
              value={row.original.twitter}
              verified={!!row.original.twitterVerifiedAt}
            />
          );
        },
      },
      {
        id: "linkedin",
        header: "LinkedIn",
        minSize: 150,
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              value={row.original.linkedin}
              verified={!!row.original.linkedinVerifiedAt}
            />
          );
        },
      },
      {
        id: "instagram",
        header: "Instagram",
        minSize: 150,
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              at
              value={row.original.instagram}
              verified={!!row.original.instagramVerifiedAt}
            />
          );
        },
      },
      {
        id: "tiktok",
        header: "TikTok",
        minSize: 150,
        cell: ({ row }) => {
          return (
            <PartnerSocialColumn
              at
              value={row.original.tiktok}
              verified={!!row.original.tiktokVerifiedAt}
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
          <RowMenuButton row={row} workspaceId={workspaceId!} />
        ),
      },
    ],
    [workspaceId, groups],
  );

  const { table, ...tableProps } = useTable<EnrolledPartnerProps>({
    data: partners || [],
    columns,
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

    getRowId: (row) => row.id,
    selectionControls: (table) => (
      <>
        <Button
          variant="primary"
          text="Approve"
          className="h-7 w-fit rounded-lg px-2.5"
          // loading={isApprovingPartners}
          onClick={() => {
            const partners = table
              .getSelectedRowModel()
              .rows.map((row) => row.original);

            setPendingApprovePartners(partners);
            setShowBulkApprovePartnersModal(true);
          }}
        />
        <Button
          variant="secondary"
          text="Reject"
          className="h-7 w-fit rounded-lg px-2.5"
          loading={isRejectingPartners}
          onClick={() => {
            const partnerIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            setPendingRejectIds(partnerIds);
            setShowRejectModal(true);
          }}
        />
      </>
    ),

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
      <BulkApprovePartnersModal />
      {rejectModal}

      <div className="w-min">
        <SearchBoxPersisted
          placeholder="Search by name or email"
          inputClassName="md:w-72"
        />
      </div>
      {partners?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No applications found"
          description={
            search
              ? "No applications found for your search."
              : "No applications have been submitted for this program."
          }
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

function RowMenuButton({
  row,
  workspaceId,
}: {
  row: Row<EnrolledPartnerProps>;
  workspaceId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync: rejectPartner, isPending: isRejectingPartner } =
    useAction(rejectPartnerAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: () => {
        toast.success(`Partner application rejected`);
        mutatePrefix(["/api/partners", "/api/partners/count"]);
      },
    });

  const { setShowConfirmModal: setShowRejectModal, confirmModal: rejectModal } =
    useConfirmModal({
      title: "Reject Application",
      description: "Are you sure you want to reject this application?",
      confirmText: "Reject",
      onConfirm: async () => {
        await rejectPartner({
          workspaceId: workspaceId!,
          partnerId: row.original.id,
        });
      },
    });

  return (
    <>
      {rejectModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                as={Command.Item}
                icon={UserXmark}
                variant="danger"
                onSelect={() => {
                  setIsOpen(false);
                  setShowRejectModal(true);
                }}
              >
                Reject application
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
            isRejectingPartner ? (
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
