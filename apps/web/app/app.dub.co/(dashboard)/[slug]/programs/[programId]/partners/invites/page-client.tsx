"use client";

import { resendProgramInviteAction } from "@/lib/actions/resend-program-invite";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramInviteProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import {
  Button,
  Icon,
  Popover,
  Table,
  usePagination,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import {
  Dots,
  EnvelopeArrowRight,
  LoadingSpinner,
  Users,
} from "@dub/ui/src/icons";
import {
  cn,
  DICEBEAR_AVATAR_URL,
  fetcher,
  formatDate,
  getPrettyUrl,
} from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { KeyedMutator } from "swr";

export function ProgramPartnersInvitesPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams();
  const { getQueryString } = useRouterStuff();

  const {
    data: programInvites,
    mutate,
    error,
  } = useSWR<ProgramInviteProps[]>(
    `/api/programs/${programId}/invites${getQueryString({
      workspaceId,
    })}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  const { data: invitesCount, error: invitesCountError } = useSWR<number>(
    `/api/programs/${programId}/invites/count?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { pagination, setPagination } = usePagination();

  const { table, ...tableProps } = useTable({
    data: programInvites || [],
    columns: [
      {
        id: "partner",
        header: "Partner",
        enableHiding: false,
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <img
                src={`${DICEBEAR_AVATAR_URL}${row.original.email}`}
                alt={row.original.email}
                className="size-5 rounded-full"
              />
              <div>{row.original.email}</div>
            </div>
          );
        },
      },
      {
        id: "createdAt",
        header: "Invited",
        accessorFn: (d) => formatDate(d.createdAt, { month: "short" }),
      },
      {
        id: "shortLink",
        header: "Referral link",
        accessorFn: (d) => getPrettyUrl(d.shortLink),
      },
      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => <RowMenuButton row={row} mutate={mutate} />,
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    resourceName: (p) => `invite${p ? "s" : ""}`,
    rowCount: invitesCount || 0,
    loading: !programInvites && !error && !invitesCountError,
    error: error ? "Failed to load program invites" : undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      {programInvites?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No partner invites found"
          description="No partner invites have been created for this program yet."
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
  mutate,
}: {
  row: Row<ProgramInviteProps>;
  mutate: KeyedMutator<ProgramInviteProps[]>;
}) {
  const { id: workspaceId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync, isExecuting } = useAction(resendProgramInviteAction, {
    onSuccess: async () => {
      await mutate();
      toast.success("Invite resent");
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to resend invite");
    },
  });

  return (
    <Popover
      openPopover={isOpen}
      setOpenPopover={setIsOpen}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[160px]">
            <MenuItem
              icon={isExecuting ? LoadingSpinner : EnvelopeArrowRight}
              label="Resend invite"
              onSelect={async () => {
                await executeAsync({
                  workspaceId: workspaceId!,
                  programInviteId: row.original.id,
                });
              }}
              disabled={isExecuting}
            />
          </Command.List>
        </Command>
      }
      align="end"
    >
      <Button
        type="button"
        className="h-8 whitespace-nowrap px-2"
        variant="outline"
        icon={<Dots className="h-4 w-4 shrink-0" />}
      />
    </Popover>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabled,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-gray-100",
        disabled && "cursor-not-allowed opacity-75",
      )}
      onSelect={onSelect}
      disabled={disabled}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
