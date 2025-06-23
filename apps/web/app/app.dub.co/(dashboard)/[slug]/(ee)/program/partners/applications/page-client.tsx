"use client";

import { approvePartnersBulkAction } from "@/lib/actions/partners/approve-partners-bulk";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { rejectPartnersBulkAction } from "@/lib/actions/partners/reject-partners-bulk";
import usePartner from "@/lib/swr/use-partner";
import usePartnersCount from "@/lib/swr/use-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerApplicationSheet } from "@/ui/partners/partner-application-sheet";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  Button,
  EditColumnsButton,
  MenuItem,
  Popover,
  Table,
  Tooltip,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  BadgeCheck2Fill,
  Dots,
  LoadingSpinner,
  Users,
  UserXmark,
} from "@dub/ui/icons";
import {
  COUNTRIES,
  fetcher,
  formatDate,
  getPrettyUrl,
  pluralize,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useColumnVisibility } from "./use-column-visibility";

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
    mutate,
  } = useSWR<EnrolledPartnerProps[]>(
    `/api/partners${getQueryString(
      {
        workspaceId,
        status: "pending",
      },
      { exclude: ["partnerId"] },
    )}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

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
    useAction(rejectPartnersBulkAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: ({ input }) => {
        toast.success(
          `${pluralize("Partner", input.partnerIds.length)} rejected`,
        );
        mutate();
      },
    });

  const { executeAsync: approvePartners, isPending: isApprovingPartners } =
    useAction(approvePartnersBulkAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: ({ input }) => {
        toast.success(
          `${pluralize("Partner", input.partnerIds.length)} approved`,
        );
        mutate();
      },
    });

  const { columnVisibility, setColumnVisibility } = useColumnVisibility();
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
              showPayoutsEnabled={false}
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
            <SocialColumn
              value={getPrettyUrl(row.original.website)}
              verified={!!row.original.websiteVerifiedAt}
              href={row.original.website}
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
            <SocialColumn
              at
              value={row.original.youtube}
              verified={!!row.original.youtubeVerifiedAt}
              href={`https://youtube.com/@${row.original.youtube}`}
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
            <SocialColumn
              at
              value={row.original.twitter}
              verified={!!row.original.twitterVerifiedAt}
              href={`https://x.com/${row.original.twitter}`}
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
            <SocialColumn
              value={row.original.linkedin}
              verified={!!row.original.linkedinVerifiedAt}
              href={`https://linkedin.com/in/${row.original.linkedin}`}
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
            <SocialColumn
              at
              value={row.original.instagram}
              verified={!!row.original.instagramVerifiedAt}
              href={`https://instagram.com/${row.original.instagram}`}
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
            <SocialColumn
              at
              value={row.original.tiktok}
              verified={!!row.original.tiktokVerifiedAt}
              href={`https://tiktok.com/@${row.original.tiktok}`}
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
          <RowMenuButton row={row} workspaceId={workspaceId!} mutate={mutate} />
        ),
      },
    ],
    [workspaceId],
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
    sortableColumns: [
      "createdAt",
      "clicks",
      "leads",
      "sales",
      "saleAmount",
      "commissions",
      "netRevenue",
    ],

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
          loading={isApprovingPartners}
          onClick={() => {
            if (
              !window.confirm(
                "Are you sure you want to approve these applications?",
              )
            )
              return;

            const partnerIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            approvePartners({
              workspaceId: workspaceId!,
              partnerIds,
            });
          }}
        />
        <Button
          variant="secondary"
          text="Reject"
          className="h-7 w-fit rounded-lg px-2.5"
          loading={isRejectingPartners}
          onClick={() => {
            if (
              !window.confirm(
                "Are you sure you want to reject these applications?",
              )
            )
              return;

            const partnerIds = table
              .getSelectedRowModel()
              .rows.map((row) => row.original.id);

            rejectPartners({
              workspaceId: workspaceId!,
              partnerIds,
            });
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

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.partnerId && currentPartner && (
        <PartnerApplicationSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
        />
      )}
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
  mutate,
}: {
  row: Row<EnrolledPartnerProps>;
  workspaceId: string;
  mutate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync: rejectPartner, isPending: isRejectingPartner } =
    useAction(rejectPartnerAction, {
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
      onSuccess: () => {
        toast.success(`Partner application rejected`);
        mutate();
      },
    });

  return (
    <>
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
                  if (
                    !window.confirm(
                      "Are you sure you want to reject this application?",
                    )
                  )
                    return;

                  rejectPartner({
                    workspaceId: workspaceId!,
                    partnerId: row.original.id,
                  });
                }}
              >
                Reject partner
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

function SocialColumn({
  at,
  value,
  verified,
  href,
}: {
  at?: boolean;
  value: string;
  verified: boolean;
  href: string;
}) {
  return value ? (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 hover:underline"
    >
      <span className="min-w-0 truncate">
        {at && "@"}
        {value}
      </span>
      {verified && (
        <Tooltip content="Verified" disableHoverableContent>
          <div>
            <BadgeCheck2Fill className="size-4 text-green-600" />
          </div>
        </Tooltip>
      )}
    </Link>
  ) : (
    "-"
  );
}
