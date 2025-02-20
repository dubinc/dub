"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import { scopesToName } from "@/lib/api/tokens/scopes";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { useAddEditTokenModal } from "@/ui/modals/add-edit-token-modal";
import { useDeleteTokenModal } from "@/ui/modals/delete-token-modal";
import { useTokenCreatedModal } from "@/ui/modals/token-created-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Delete } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  Dots,
  Icon,
  Key,
  PenWriting,
  Popover,
  Table,
  Tooltip,
  usePagination,
  useTable,
} from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL, fetcher, timeAgo } from "@dub/utils";
import { Command } from "cmdk";
import { useState } from "react";
import useSWR from "swr";

export default function TokensPageClient() {
  const { id: workspaceId, role } = useWorkspace();
  const { pagination, setPagination } = usePagination();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenProps | null>(null);

  const {
    data: tokens,
    isLoading,
    error,
  } = useSWR<TokenProps[]>(`/api/tokens?workspaceId=${workspaceId}`, fetcher);

  const { TokenCreatedModal, setShowTokenCreatedModal } = useTokenCreatedModal({
    token: createdToken || "",
  });

  const onTokenCreated = (token: string) => {
    setCreatedToken(token);
    setShowTokenCreatedModal(true);
  };

  const { AddEditTokenModal, AddTokenButton, setShowAddEditTokenModal } =
    useAddEditTokenModal({
      ...(selectedToken && {
        token: {
          id: selectedToken.id,
          name: selectedToken.name,
          isMachine: selectedToken.user.isMachine,
          scopes: mapScopesToResource(selectedToken.scopes),
        },
      }),
      ...(!selectedToken && { onTokenCreated }),
      setSelectedToken,
    });

  const accessCheckError = clientAccessCheck({
    action: "tokens.write",
    role,
    customPermissionDescription: "update or delete API keys",
  }).error;

  const { table, ...tableProps } = useTable({
    data: tokens || [],
    loading: isLoading && !error && !tokens,
    error: error ? "Failed to fetch tokens." : undefined,
    columns: [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => {
          return (
            <span className="flex items-center gap-2">
              <Key className="size-4 text-neutral-500" />
              {row.original.name}
            </span>
          );
        },
      },
      {
        id: "permissions",
        header: "Permissions",
        accessorKey: "scopes",
        cell: ({ row }) => scopesToName(row.original.scopes).name,
      },
      {
        id: "user",
        header: "Created",
        accessorKey: "user",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <Tooltip content={row.original.user.name}>
                <img
                  src={
                    row.original.user.isMachine
                      ? "https://api.dicebear.com/7.x/bottts/svg?seed=Sara"
                      : row.original.user.image ||
                        `${DICEBEAR_AVATAR_URL}${row.original.user.id}`
                  }
                  alt={row.original.user.name!}
                  className="size-5 rounded-full"
                />
              </Tooltip>
              <p>
                {new Date(row.original.createdAt).toLocaleDateString("en-us", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          );
        },
      },
      {
        id: "partialKey",
        header: "Key",
        accessorKey: "partialKey",
        cell: ({ row }) => row.original.partialKey,
      },
      {
        id: "lastUsed",
        header: "Last used",
        accessorKey: "lastUsed",
        cell: ({ row }) => timeAgo(row.original.lastUsed),
      },

      // Menu
      {
        id: "menu",
        enableHiding: false,
        minSize: 43,
        size: 43,
        maxSize: 43,
        cell: ({ row }) => (
          <RowMenuButton
            token={row.original}
            onEdit={() => {
              setSelectedToken(row.original);
              setShowAddEditTokenModal(true);
            }}
          />
        ),
      },
    ],
    pagination,
    onPaginationChange: setPagination,
    rowCount: tokens?.length || 0,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
    onRowClick: accessCheckError
      ? undefined
      : (row) => {
          setSelectedToken(row.original);
          setShowAddEditTokenModal(true);
        },
    emptyState: (
      <AnimatedEmptyState
        title="No tokens found"
        description="No tokens have been created for this workspace yet."
        cardContent={() => (
          <>
            <Key className="size-4 text-neutral-700" />
            <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
          </>
        )}
        addButton={<AddTokenButton />}
        learnMoreHref="https://dub.co/docs/api-reference/tokens"
      />
    ),
    resourceName: (plural) => `token${plural ? "s" : ""}`,
  });

  return (
    <div className="grid grid-cols-1">
      <TokenCreatedModal />
      <AddEditTokenModal />

      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Secret keys
      </h1>
      <p className="mb-2 mt-2 text-base text-neutral-600">
        These API keys allow other apps to access your workspace. Use it with
        caution – do not share your API key with others, or expose it in the
        browser or other client-side code.{" "}
        <a
          href="https://dub.co/docs/api-reference/tokens"
          target="_blank"
          className="font-medium underline underline-offset-4 hover:text-black"
        >
          Learn more
        </a>
      </p>

      <div className="flex w-full items-center justify-end pb-4">
        <AddTokenButton />
      </div>

      {tokens?.length !== 0 ? (
        <Table {...tableProps} table={table} />
      ) : (
        <AnimatedEmptyState
          title="No tokens found"
          description="No tokens have been created for this workspace yet."
          cardContent={() => (
            <>
              <Key className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
        />
      )}
    </div>
  );
}

function RowMenuButton({
  token,
  onEdit,
}: {
  token: TokenProps;
  onEdit: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { role } = useWorkspace();
  const { DeleteTokenModal, setShowDeleteTokenModal } = useDeleteTokenModal({
    token,
  });

  return (
    <>
      <DeleteTokenModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm sm:w-auto sm:min-w-[130px]">
              <MenuItem icon={PenWriting} label="Edit" onSelect={onEdit} />

              <MenuItem
                icon={Delete}
                label="Delete"
                danger={true}
                onSelect={() => {
                  setIsOpen(false);
                  setShowDeleteTokenModal(true);
                }}
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
          disabledTooltip={
            clientAccessCheck({
              action: "tokens.write",
              role,
              customPermissionDescription: "update or delete API keys",
            }).error
          }
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  danger,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        danger
          ? buttonVariants({ variant: "danger-outline" })
          : "text-neutral-500 data-[selected=true]:bg-neutral-100",
      )}
      onSelect={onSelect}
    >
      <IconComp
        className={cn(
          "size-4 shrink-0",
          danger ? "hover:bg-red-600 hover:text-white" : "text-neutral-500",
        )}
      />
      {label}
    </Command.Item>
  );
}

const mapScopesToResource = (scopes: string[]) => {
  const result = scopes.map((scope) => {
    const [resource] = scope.split(".");

    return {
      [resource]: scope,
    };
  });

  return Object.assign({}, ...result);
};
