import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { Badge, Button, Modal, TokenAvatar, useMediaQuery } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function DeleteTokenModal({
  showDeleteTokenModal,
  setShowDeleteTokenModal,
  token,
}: {
  showDeleteTokenModal: boolean;
  setShowDeleteTokenModal: Dispatch<SetStateAction<boolean>>;
  token: TokenProps;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const [removing, setRemoving] = useState(false);

  // Determine the endpoint
  const isRestrictedToken = "scopes" in token ? true : false;

  const endpoint = useMemo(() => {
    if (!isRestrictedToken) {
      return {
        url: `/api/user/tokens?id=${token.id}`,
        mutate: "/api/user/tokens",
      };
    } else {
      return {
        url: `/api/tokens/${token.id}?workspaceId=${workspaceId}`,
        mutate: `/api/tokens?workspaceId=${workspaceId}`,
      };
    }
  }, [isRestrictedToken]);

  return (
    <Modal
      showModal={showDeleteTokenModal}
      setShowModal={setShowDeleteTokenModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Delete API Key</h3>
        <p className="text-sm text-gray-500">
          This will permanently delete the API key for and revoke all access to
          your account. Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        <div className="relative flex items-center space-x-3 rounded-md border border-gray-300 bg-white px-1 py-3">
          <Badge variant="neutral" className="absolute right-2 top-2">
            {token.partialKey}
          </Badge>
          <TokenAvatar id={token.id} />
          <div className="flex flex-col">
            <h3 className="line-clamp-1 w-48 font-semibold text-gray-700">
              {token.name}
            </h3>
            <p className="text-xs text-gray-500" suppressHydrationWarning>
              Last used {timeAgo(token.lastUsed, { withAgo: true })}
            </p>
          </div>
        </div>
        <Button
          text="Delete"
          variant="danger"
          autoFocus={!isMobile}
          loading={removing}
          onClick={() => {
            setRemoving(true);
            fetch(endpoint.url, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            }).then(async (res) => {
              setRemoving(false);
              if (res.status === 200) {
                toast.success(`Successfully deleted API key`);
                mutate(endpoint.mutate);
                setShowDeleteTokenModal(false);
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
        />
      </div>
    </Modal>
  );
}

export function useDeleteTokenModal({ token }: { token: TokenProps }) {
  const [showDeleteTokenModal, setShowDeleteTokenModal] = useState(false);

  const DeleteTokenModalCallback = useCallback(() => {
    return (
      <DeleteTokenModal
        showDeleteTokenModal={showDeleteTokenModal}
        setShowDeleteTokenModal={setShowDeleteTokenModal}
        token={token}
      />
    );
  }, [showDeleteTokenModal, setShowDeleteTokenModal]);

  return useMemo(
    () => ({
      setShowDeleteTokenModal,
      DeleteTokenModal: DeleteTokenModalCallback,
    }),
    [setShowDeleteTokenModal, DeleteTokenModalCallback],
  );
}
