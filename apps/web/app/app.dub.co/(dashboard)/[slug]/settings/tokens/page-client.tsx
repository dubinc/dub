"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { useAddEditTokenModal } from "@/ui/modals/add-edit-token-modal";
import { useDeleteTokenModal } from "@/ui/modals/delete-token-modal";
import { useTokenCreatedModal } from "@/ui/modals/token-created-modal";
import { Delete } from "@/ui/shared/icons";
import { Button, LoadingSpinner, Popover, TokenAvatar } from "@dub/ui";
import { fetcher, timeAgo } from "@dub/utils";
import { Edit3, FolderOpen, MoreVertical } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

export default function TokensPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { data: tokens, isLoading } = useSWR<TokenProps[]>(
    `/api/tokens?workspaceId=${workspaceId}`,
    fetcher,
  );

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const { TokenCreatedModal, setShowTokenCreatedModal } = useTokenCreatedModal({
    token: createdToken || "",
  });

  const onTokenCreated = (token: string) => {
    setCreatedToken(token);
    setShowTokenCreatedModal(true);
  };

  const { AddEditTokenModal, AddTokenButton } = useAddEditTokenModal({
    onTokenCreated,
  });

  return (
    <>
      <TokenCreatedModal />
      <AddEditTokenModal />
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between gap-2 space-y-3 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">API Keys</h2>
            <p className="text-sm text-gray-500">
              These API keys allow other apps to access your workspace. Use it
              with caution – do not share your API key with others, or expose it
              in the browser or other client-side code
            </p>
          </div>
          <div className="flex">
            <AddTokenButton />
          </div>
        </div>
        {isLoading || !tokens ? (
          <div className="flex flex-col items-center justify-center space-y-4 pb-20 pt-10">
            <LoadingSpinner className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">Fetching API keys...</p>
          </div>
        ) : tokens.length > 0 ? (
          <div>
            <div className="grid grid-cols-5 border-b border-gray-200 px-5 py-2 text-sm font-medium text-gray-500 sm:px-10">
              <div className="col-span-3">Name</div>
              <div>Key</div>
              <div className="text-center">Last used</div>
            </div>
            <div className="divide-y divide-gray-200">
              {tokens.map((token) => (
                <TokenRow key={token.id} {...token} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 pb-20 pt-10">
            <FolderOpen className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">
              No API keys found for this workspace.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

const TokenRow = (token: TokenProps) => {
  const [openPopover, setOpenPopover] = useState(false);

  const { setShowAddEditTokenModal, AddEditTokenModal } = useAddEditTokenModal({
    token: {
      id: token.id,
      name: token.name,
      isMachine: token.user.isMachine,
      scopes: mapScopesToResource(token.scopes),
    },
  });

  const { DeleteTokenModal, setShowDeleteTokenModal } = useDeleteTokenModal({
    token,
  });

  return (
    <>
      <AddEditTokenModal />
      <DeleteTokenModal />
      <div className="relative grid grid-cols-5 items-center px-5 py-3 sm:px-10">
        <div className="col-span-3 flex items-center space-x-3">
          <TokenAvatar id={token.id} />
          <div className="flex flex-col space-y-px">
            <p className="font-semibold text-gray-700">{token.name}</p>
            <p className="text-sm text-gray-500" suppressHydrationWarning>
              Created {timeAgo(token.createdAt, { withAgo: true })}
            </p>
          </div>
        </div>
        <div className="font-mono text-sm">{token.partialKey}</div>
        <div
          className="text-center text-sm text-gray-500"
          suppressHydrationWarning
        >
          {timeAgo(token.lastUsed)}
        </div>
        <Popover
          content={
            <div className="w-full sm:w-48">
              <div className="grid gap-px p-2">
                <Button
                  text="Edit API Key"
                  variant="outline"
                  icon={<Edit3 className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowAddEditTokenModal(true);
                  }}
                />
                <Button
                  text="Delete API Key"
                  variant="danger-outline"
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteTokenModal(true);
                  }}
                />
              </div>
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <button
            onClick={() => {
              setOpenPopover(!openPopover);
            }}
            className="absolute right-4 rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
          >
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
        </Popover>
      </div>
    </>
  );
};

const mapScopesToResource = (scopes: string[]) => {
  const result = scopes.map((scope) => {
    const [resource] = scope.split(".");

    return {
      [resource]: scope,
    };
  });

  return Object.assign({}, ...result);
};
