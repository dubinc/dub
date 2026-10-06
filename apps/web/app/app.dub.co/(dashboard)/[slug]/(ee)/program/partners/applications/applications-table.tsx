"use client";

import { useProgramApplications } from "@/lib/program-applications/hooks/use-program-applications";
import { useProgramApplicationsCount } from "@/lib/program-applications/hooks/use-program-applications-count";
import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useGroups from "@/lib/swr/use-groups";
import usePartner from "@/lib/swr/use-partner";
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
import { COUNTRIES, formatDate } from "@dub/utils";
import { ProgramApplicationStatus } from "@prisma/client";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";

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

  const { currentApplication, isLoading: isCurrentApplicationLoading } =
    useCurrentApplication({
      partners,
      applicationId: detailsSheetState.applicationId,
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

  const { pagination, setPagination } = usePagination();

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

  const [previousApplication, nextApplication] = useMemo(() => {
    if (!partners || !detailsSheetState.applicationId) return [null, null];

    const currentIndex = partners.findIndex(
      ({ applicationId }) => applicationId === detailsSheetState.applicationId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? partners[currentIndex - 1] : null,
      currentIndex < partners.length - 1 ? partners[currentIndex + 1] : null,
    ];
  }, [partners, detailsSheetState.applicationId]);

  return (
    <>
      {detailsSheetState.applicationId && currentApplication && (
        <ProgramApplicationReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentApplication}
          onPrevious={
            previousApplication
              ? () =>
                  queryParams({
                    set: { applicationId: previousApplication.applicationId },
                    del: "partnerId",
                  })
              : undefined
          }
          onNext={
            nextApplication
              ? () =>
                  queryParams({
                    set: { applicationId: nextApplication.applicationId },
                    del: "partnerId",
                  })
              : undefined
          }
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

/** Gets the application row from the loaded list, then loads that partner for fields the list does not include. */
function useCurrentApplication({
  partners,
  applicationId,
}: {
  partners?: ApplicationRow[];
  applicationId: string | null;
}) {
  const listedApplication = applicationId
    ? partners?.find(
        (application) => application.applicationId === applicationId,
      ) ?? null
    : null;

  const { partner: fetchedPartner, loading: isLoading } = usePartner(
    { partnerId: listedApplication?.id ?? null },
    { keepPreviousData: true },
  );

  const matchingFetchedPartner =
    fetchedPartner?.id === listedApplication?.id ? fetchedPartner : null;

  const currentApplication = useMemo(
    () =>
      listedApplication
        ? { ...matchingFetchedPartner, ...listedApplication }
        : null,
    [listedApplication, matchingFetchedPartner],
  );

  return {
    currentApplication,
    isLoading: Boolean(applicationId) && !listedApplication && isLoading,
  };
}
