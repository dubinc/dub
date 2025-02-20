import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps } from "@/lib/types";
import { Button, Key, Modal, Tooltip, useMediaQuery } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
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
        <p className="text-sm text-neutral-500">
          This will permanently delete the API key for and revoke all access to
          your account. Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        <div className="relative flex items-center gap-2 space-x-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          <Key className="size-5 text-neutral-500" />

          <div className="flex flex-1 flex-col gap-0.5">
            <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
              {token.name}
            </h3>
            <p
              className="text-xs font-medium text-neutral-500"
              suppressHydrationWarning
            >
              {token.partialKey}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {token.user && (
              <Tooltip content={token.user.name}>
                <img
                  src={
                    token.user.isMachine
                      ? "https://api.dicebear.com/7.x/bottts/svg?seed=Sara"
                      : token.user.image ||
                        `${DICEBEAR_AVATAR_URL}${token.user.id}`
                  }
                  alt={token.user.name!}
                  className="size-5 rounded-full"
                />
              </Tooltip>
            )}
            <p className="text-xs text-neutral-500">
              {new Date(token.createdAt).toLocaleDateString("en-us", {
                month: "short",
                day: "numeric",
              })}
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
                const { error } = await res.json();
                toast.error(error.message);
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
