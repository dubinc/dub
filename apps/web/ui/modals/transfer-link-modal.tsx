import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { LinkProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { SimpleLinkCard } from "../links/simple-link-card";
import { WorkspaceSelector } from "../workspaces/workspace-selector";

type TransferLinkModalProps = {
  showTransferLinkModal: boolean;
  setShowTransferLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
  onSuccess?: () => void;
};

function TransferLinkModal(props: TransferLinkModalProps) {
  return (
    <Modal
      showModal={props.showTransferLinkModal}
      setShowModal={props.setShowTransferLinkModal}
    >
      <TransferLinkModalInner {...props} />
    </Modal>
  );
}

function TransferLinkModalInner({
  setShowTransferLinkModal,
  props,
  onSuccess,
}: TransferLinkModalProps) {
  const { id: currentWorkspaceId } = useWorkspace();
  const [transferring, setTransferring] = useState(false);
  const { workspaces } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );
  const [verificationText, setVerificationText] = useState("");

  const { isMobile } = useMediaQuery();

  const transferLink = async (linkId: string, selectedWorkspace: string) => {
    setTransferring(true);
    const newWorkspaceId = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace,
    )?.id;
    if (!newWorkspaceId) {
      toast.error("New workspace not found.");
      return;
    }

    return await fetch(
      `/api/links/${linkId}/transfer?workspaceId=${currentWorkspaceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newWorkspaceId }),
      },
    ).then(async (res) => {
      if (res.ok) {
        mutatePrefix("/api/links");
        setShowTransferLinkModal(false);
        onSuccess?.();
      } else {
        const { error } = await res.json();
        toast.error(error.message || "Failed to transfer link.");
      }

      setTransferring(false);
    });
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Transfer link</h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to transfer this link?
        </p>

        <p className="mt-4 text-sm font-medium text-neutral-800">
          Transferring a link will fully reset its stats and is irreversible –
          please proceed with caution.
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          <SimpleLinkCard link={props} />
        </div>

        <div className="mt-4">
          <WorkspaceSelector
            selectedWorkspace={selectedWorkspace || ""}
            setSelectedWorkspace={setSelectedWorkspace}
          />
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (selectedWorkspace) {
            await transferLink(props.id, selectedWorkspace);
          }
        }}
        className="flex flex-col bg-neutral-50 text-left"
      >
        <div className="px-4 sm:px-6">
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">confirm transfer link</span> below
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm transfer link"
              required
              autoFocus={!isMobile}
              autoComplete="off"
              value={verificationText}
              onChange={(e) => setVerificationText(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowTransferLinkModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            disabled={
              !selectedWorkspace || verificationText !== "confirm transfer link"
            }
            loading={transferring}
            text="Transfer link"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useTransferLinkModal({
  props,
  onSuccess,
}: {
  props: LinkProps;
  onSuccess?: () => void;
}) {
  const [showTransferLinkModal, setShowTransferLinkModal] = useState(false);

  const TransferLinkModalCallback = useCallback(() => {
    return props ? (
      <TransferLinkModal
        showTransferLinkModal={showTransferLinkModal}
        setShowTransferLinkModal={setShowTransferLinkModal}
        props={props}
        onSuccess={onSuccess}
      />
    ) : null;
  }, [showTransferLinkModal, setShowTransferLinkModal]);

  return useMemo(
    () => ({
      setShowTransferLinkModal,
      TransferLinkModal: TransferLinkModalCallback,
    }),
    [setShowTransferLinkModal, TransferLinkModalCallback],
  );
}
