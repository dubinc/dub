"use client";

import { useProgramApplications } from "@/lib/program-applications/hooks/use-program-applications";
import { useProgramApplicationsCount } from "@/lib/program-applications/hooks/use-program-applications-count";
import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramApplicationProps } from "@/lib/types";
import { useBulkApproveProgramApplicationsModal } from "@/ui/modals/bulk-approve-program-applications-modal";
import { useBulkRejectProgramApplicationsModal } from "@/ui/modals/bulk-reject-program-applications-modal";
import { useRejectProgramApplicationModal } from "@/ui/modals/reject-program-application-modal";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { PartnerSocialColumn } from "@/ui/partners/partner-social-column";
import { ProgramApplicationReviewSheet } from "@/ui/partners/program-application-review-sheet";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CountryFlag } from "@/ui/shared/country-flag";
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
import { Check, Dots, UserCheck, Users, UserXmark } from "@dub/ui/icons";
import { COUNTRIES, fetcher, formatDate } from "@dub/utils";
import { ProgramApplication, ProgramApplicationStatus } from "@prisma/client";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type ApplicationPlatform = NonNullable<
  ProgramApplicationProps["partner"]["platforms"]
>[number];

type ApplicationRow = ProgramApplicationProps["partner"] & {
  createdAt: ProgramApplicationProps["createdAt"];
  applicationId: string;
  platformsByType: ReturnType<
    typeof buildSocialPlatformLookup<ApplicationPlatform>
  >;
};

const applicationsColumns = {
  all: [
    "partner",
    "createdAt",
    "source",
    "group",
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
    "source",
    "location",
    "website",
    "youtube",
    "linkedin",
  ],
};

const EMPTY_STATE_TITLES: Record<ProgramApplicationStatus, string> = {
  pending: "No applications found",
  approved: "No approved applications found",
  rejected: "No rejected applications found",
};

export function ApplicationsTable({
  status,
}: {
  status: ProgramApplicationStatus;
}) {
  const { queryParams, searchParams, searchParamsObj } = useRouterStuff();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const isFiltered = Object.keys(searchParamsObj).some(
    (key) =>
      !["sortBy", "sortOrder", "page", "partnerId", "applicationId"].includes(
        key,
      ),
  );

  const { applicationsCount, error: countError } =
    useProgramApplicationsCount<number>({
      status,
    });

  const { applications, error, isValidating } = useProgramApplications({
    status,
  });

  const partners = useMemo(
    () =>
      applications?.map((application) => ({
        ...application.partner,
        createdAt: application.createdAt,
        applicationId: application.id,
        platformsByType: buildSocialPlatformLookup(
          application.partner.platforms ?? [],
        ),
      })),
    [applications],
  );

  const { groups } = useGroups();

  const { pagination, setPagination } = usePagination();

  const {
    detailsSheetState,
    setDetailsSheetState,
    currentApplication,
    isLoading: isCurrentApplicationLoading,
    onPreviousApplication,
    onNextApplication,
  } = useApplicationSheet({
    partners,
    isValidating,
    applicationsCount,
    pagination,
    setPagination,
  });

  // State for pending bulk actions
  const [pendingApprovePartners, setPendingApprovePartners] = useState<
    ApplicationRow[]
  >([]);

  const [pendingRejectPartners, setPendingRejectPartners] = useState<
    ApplicationRow[]
  >([]);

  const {
    setShowBulkApproveProgramApplicationsModal,
    BulkApproveProgramApplicationsModal,
  } = useBulkApproveProgramApplicationsModal({
    partners: pendingApprovePartners,
  });

  const {
    setShowBulkRejectProgramApplicationsModal,
    BulkRejectProgramApplicationsModal,
  } = useBulkRejectProgramApplicationsModal({
    partners: pendingRejectPartners,
  });

  const { columnVisibility, setColumnVisibility } = useColumnVisibility(
    "applications-table-columns-v2",
    applicationsColumns,
  );

  const columns = useMemo(
    () => [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        minSize: 250,
        cell: ({ row }) => {
          return (
            <PartnerRowItem
              partner={row.original}
              showPermalink={false}
              showFraudIndicator={status === ProgramApplicationStatus.pending}
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
              {country && <CountryFlag countryCode={country} />}
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
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.website}
            platformName="website"
          />
        ),
      },
      {
        id: "youtube",
        header: "YouTube",
        minSize: 150,
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.youtube}
            platformName="youtube"
          />
        ),
      },
      {
        id: "twitter",
        header: "X/Twitter",
        minSize: 150,
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.twitter}
            platformName="twitter"
          />
        ),
      },
      {
        id: "linkedin",
        header: "LinkedIn",
        minSize: 150,
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.linkedin}
            platformName="linkedin"
          />
        ),
      },
      {
        id: "instagram",
        header: "Instagram",
        minSize: 150,
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.instagram}
            platformName="instagram"
          />
        ),
      },
      {
        id: "tiktok",
        header: "TikTok",
        minSize: 150,
        cell: ({ row }: { row: Row<ApplicationRow> }) => (
          <PartnerSocialColumn
            platform={row.original.platformsByType.tiktok}
            platformName="tiktok"
          />
        ),
      },

      // Menu
      {
        id: "menu",
        enableHiding: false,
        header: ({ table }) => <EditColumnsButton table={table} />,
        cell: ({ row }) =>
          status === ProgramApplicationStatus.pending ? (
            <PendingRowMenuButton row={row} />
          ) : status === ProgramApplicationStatus.rejected ? (
            <RejectedRowMenuButton row={row} />
          ) : null,
      },
    ],
    [groups, status],
  );

  const { table, ...tableProps } = useTable<ApplicationRow>({
    data: partners || [],
    columns,
    columnPinning: { right: ["menu"] },
    onRowClick: (row) => {
      queryParams({
        set: {
          applicationId: row.original.applicationId,
        },
        del: "partnerId",
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
      }),

    ...(status !== ProgramApplicationStatus.approved && {
      getRowId: (row: ApplicationRow) => row.applicationId,
      selectionControls: (table) => (
        <>
          <Button
            variant="primary"
            text="Approve"
            className="h-7 w-fit rounded-lg px-2.5"
            onClick={() => {
              const partners = table
                .getSelectedRowModel()
                .rows.map((row) => row.original);

              setPendingApprovePartners(partners);
              setShowBulkApproveProgramApplicationsModal(true);
            }}
          />
          {status === ProgramApplicationStatus.pending && (
            <Button
              variant="secondary"
              text="Reject"
              className="h-7 w-fit rounded-lg px-2.5"
              onClick={() => {
                const selectedPartners = table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original);

                setPendingRejectPartners(selectedPartners);
                setShowBulkRejectProgramApplicationsModal(true);
              }}
            />
          )}
        </>
      ),
    }),

    containerClassName: "border-none",
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `application${p ? "s" : ""}`,
    rowCount: applicationsCount || 0,
    loading: isValidating || isCurrentApplicationLoading,
    error: error || countError ? "Failed to load applications" : undefined,
  });

  return (
    <>
      {detailsSheetState.applicationId && currentApplication && (
        <ProgramApplicationReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentApplication}
          onPrevious={onPreviousApplication}
          onNext={onNextApplication}
        />
      )}
      {BulkApproveProgramApplicationsModal}
      <BulkRejectProgramApplicationsModal />

      {partners?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          className="border-none"
          title={EMPTY_STATE_TITLES[status]}
          description={`${EMPTY_STATE_TITLES[status]}${isFiltered ? " for the selected filters" : " for this program"}.`}
          cardContent={() => (
            <>
              <Users className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </>
  );
}

function PendingRowMenuButton({ row }: { row: Row<ApplicationRow> }) {
  const [isOpen, setIsOpen] = useState(false);

  const partners = useMemo(() => [row.original], [row.original]);

  const {
    BulkApproveProgramApplicationsModal,
    setShowBulkApproveProgramApplicationsModal,
  } = useBulkApproveProgramApplicationsModal({
    partners,
    groupId: row.original.groupId,
  });

  const {
    RejectProgramApplicationModal,
    setShowRejectProgramApplicationModal,
  } = useRejectProgramApplicationModal({
    partner: row.original,
    onConfirm: async () => {
      await mutatePrefix([
        "/api/partners",
        "/api/partners/count",
        "/api/program-applications",
      ]);
    },
  });

  return (
    <>
      {BulkApproveProgramApplicationsModal}
      {RejectProgramApplicationModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                as={Command.Item}
                icon={UserCheck}
                onSelect={() => {
                  setIsOpen(false);
                  setShowBulkApproveProgramApplicationsModal(true);
                }}
              >
                Approve application
              </MenuItem>
              <MenuItem
                as={Command.Item}
                icon={UserXmark}
                variant="danger"
                onSelect={() => {
                  setIsOpen(false);
                  setShowRejectProgramApplicationModal(true);
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
          className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0"
          variant="outline"
          icon={<Dots className="size-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function RejectedRowMenuButton({ row }: { row: Row<ApplicationRow> }) {
  const [isOpen, setIsOpen] = useState(false);

  const partners = useMemo(() => [row.original], [row.original]);

  const {
    BulkApproveProgramApplicationsModal,
    setShowBulkApproveProgramApplicationsModal,
  } = useBulkApproveProgramApplicationsModal({
    partners,
    groupId: row.original.groupId,
  });

  return (
    <>
      {BulkApproveProgramApplicationsModal}
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
                  setShowBulkApproveProgramApplicationsModal(true);
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
          className="size-8 shrink-0 whitespace-nowrap rounded-lg p-0"
          variant="outline"
          icon={<Dots className="size-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

type Pagination = ReturnType<typeof usePagination>;

// Keeps the review sheet in sync with `?applicationId=`, resolves the open application, and builds previous/next handlers that continue onto adjacent pages.
function useApplicationSheet({
  partners,
  isValidating,
  applicationsCount,
  pagination,
  setPagination,
}: {
  partners?: ApplicationRow[];
  isValidating: boolean;
  applicationsCount?: number;
  pagination: Pagination["pagination"];
  setPagination: Pagination["setPagination"];
}) {
  const { queryParams, searchParams } = useRouterStuff();

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; applicationId: string | null }
    | { open: true; applicationId: string }
  >({ open: false, applicationId: null });

  useEffect(() => {
    const applicationId = searchParams.get("applicationId");

    if (applicationId) {
      setDetailsSheetState({ open: true, applicationId });
      return;
    }

    const partnerId = searchParams.get("partnerId");

    if (!partnerId || !partners) {
      return;
    }

    const legacyRow = partners.find(({ id }) => id === partnerId);

    if (legacyRow) {
      queryParams({
        set: { applicationId: legacyRow.applicationId },
        del: "partnerId",
      });
    }
  }, [searchParams, partners, queryParams]);

  // Set when previous/next crosses a page boundary, so the first or last
  // application is opened once the adjacent page has loaded
  const [pendingPageChange, setPendingPageChange] = useState<{
    edge: "first" | "last";
    pageIndex: number;
    fromApplicationId: string;
    opening?: boolean;
  } | null>(null);

  const { currentApplication: resolvedApplication, isLoading } =
    useCurrentApplication({
      partners,
      applicationId: detailsSheetState.applicationId,
      fetchUnlisted: detailsSheetState.open && !pendingPageChange,
    });

  // Keeps the sheet mounted while the adjacent page loads, since the open
  // application is no longer in the rows until the next one is selected
  const [lastApplication, setLastApplication] =
    useState<typeof resolvedApplication>(null);

  useEffect(() => {
    if (resolvedApplication) {
      setLastApplication(resolvedApplication);
    }
  }, [resolvedApplication]);

  const currentApplication =
    resolvedApplication ?? (pendingPageChange ? lastApplication : null);

  const pageCount = Math.ceil((applicationsCount || 0) / pagination.pageSize);

  const { onPreviousApplication, onNextApplication } = useMemo(() => {
    if (!partners || !detailsSheetState.applicationId) {
      return { onPreviousApplication: undefined, onNextApplication: undefined };
    }

    const currentIndex = partners.findIndex(
      ({ applicationId }) => applicationId === detailsSheetState.applicationId,
    );

    if (currentIndex === -1) {
      return { onPreviousApplication: undefined, onNextApplication: undefined };
    }

    const openApplication = (applicationId: string) =>
      queryParams({
        set: { applicationId },
        del: "partnerId",
      });

    const goToPage = (pageIndex: number, edge: "first" | "last") => {
      setPendingPageChange({
        edge,
        pageIndex,
        fromApplicationId: partners[currentIndex].applicationId,
      });
      setPagination((p) => ({ ...p, pageIndex }));
    };

    const previousApplication =
      currentIndex > 0 ? partners[currentIndex - 1] : null;
    const nextApplication =
      currentIndex < partners.length - 1 ? partners[currentIndex + 1] : null;

    return {
      onPreviousApplication: previousApplication
        ? () => openApplication(previousApplication.applicationId)
        : pagination.pageIndex > 1
          ? () => goToPage(pagination.pageIndex - 1, "last")
          : undefined,
      onNextApplication: nextApplication
        ? () => openApplication(nextApplication.applicationId)
        : pagination.pageIndex < pageCount
          ? () => goToPage(pagination.pageIndex + 1, "first")
          : undefined,
    };
  }, [
    partners,
    detailsSheetState.applicationId,
    pagination.pageIndex,
    pageCount,
    queryParams,
    setPagination,
  ]);

  const urlPageIndex = parseInt(searchParams.get("page") || "1") || 1;

  useEffect(() => {
    if (!pendingPageChange) {
      return;
    }

    // The adjacent application was opened, the user opened another one, or
    // the sheet was closed
    if (
      detailsSheetState.applicationId !== pendingPageChange.fromApplicationId ||
      !detailsSheetState.open
    ) {
      setPendingPageChange(null);
      return;
    }

    // Wait until the rows for the target page have loaded. Refetches of the
    // current page (e.g. after approving) must not be mistaken for it.
    if (
      pendingPageChange.opening ||
      urlPageIndex !== pendingPageChange.pageIndex ||
      isValidating ||
      !partners
    ) {
      return;
    }

    // The page count shrank (e.g. the last application was just reviewed),
    // so there is nothing to open on the target page
    if (partners.length === 0) {
      setPendingPageChange(null);
      setDetailsSheetState({
        open: false,
        applicationId: detailsSheetState.applicationId,
      });
      queryParams({ del: ["applicationId", "partnerId"] });
      setPagination((p) => ({
        ...p,
        pageIndex: Math.max(1, pendingPageChange.pageIndex - 1),
      }));
      return;
    }

    const edgeApplication =
      pendingPageChange.edge === "first"
        ? partners[0]
        : partners[partners.length - 1];

    setPendingPageChange({ ...pendingPageChange, opening: true });
    queryParams({
      set: { applicationId: edgeApplication.applicationId },
      del: "partnerId",
    });
  }, [
    pendingPageChange,
    urlPageIndex,
    isValidating,
    partners,
    detailsSheetState.applicationId,
    detailsSheetState.open,
    queryParams,
    setPagination,
  ]);

  return {
    detailsSheetState,
    setDetailsSheetState,
    currentApplication,
    isLoading,
    onPreviousApplication,
    onNextApplication,
  };
}

// Gets the application row from the loaded list, then loads that partner for fields the list does not include. Falls back to fetching the application by ID when it is not on the loaded page.
function useCurrentApplication({
  partners,
  applicationId,
  fetchUnlisted,
}: {
  partners?: ApplicationRow[];
  applicationId: string | null;
  fetchUnlisted: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const listedApplication = applicationId
    ? partners?.find(
        (application) => application.applicationId === applicationId,
      ) ?? null
    : null;

  const { data: fetchedApplication, isLoading: isApplicationLoading } =
    useSWR<ProgramApplication>(
      applicationId && !listedApplication && fetchUnlisted && workspaceId
        ? `/api/program-applications/${applicationId}?workspaceId=${workspaceId}`
        : null,
      fetcher,
    );

  const unlistedApplication =
    !listedApplication && fetchedApplication?.id === applicationId
      ? fetchedApplication
      : null;

  const partnerId =
    listedApplication?.id ?? unlistedApplication?.partnerId ?? null;

  const { partner: fetchedPartner, loading: isPartnerLoading } = usePartner(
    { partnerId },
    { keepPreviousData: true },
  );

  const matchingFetchedPartner =
    partnerId && fetchedPartner?.id === partnerId ? fetchedPartner : null;

  const currentApplication = useMemo(() => {
    if (listedApplication) {
      return { ...matchingFetchedPartner, ...listedApplication };
    }

    if (unlistedApplication && matchingFetchedPartner) {
      return {
        ...matchingFetchedPartner,
        groupId: unlistedApplication.groupId,
        status: unlistedApplication.status,
        createdAt: unlistedApplication.createdAt,
        applicationId: unlistedApplication.id,
      };
    }

    return null;
  }, [listedApplication, unlistedApplication, matchingFetchedPartner]);

  return {
    currentApplication,
    isLoading:
      Boolean(applicationId) &&
      !listedApplication &&
      (isApplicationLoading || isPartnerLoading),
  };
}
