import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { DomainProps } from "@/lib/types";
import { Button, Globe, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { WorkspaceSelector } from "../workspaces/workspace-selector";

type TransferDomainModalProps = {
  showTransferDomainModal: boolean;
  setShowTransferDomainModal: Dispatch<SetStateAction<boolean>>;
  props: DomainProps;
  onSuccess?: () => void;
};

function TransferDomainModal(props: TransferDomainModalProps) {
  return (
    <Modal
      showModal={props.showTransferDomainModal}
      setShowModal={props.setShowTransferDomainModal}
    >
      <TransferDomainModalInner {...props} />
    </Modal>
  );
}

function TransferDomainModalInner({
  setShowTransferDomainModal,
  props,
  onSuccess,
}: TransferDomainModalProps) {
  const { slug: domain } = props;
  const { id: currentWorkspaceId } = useWorkspace();
  const [transferring, setTransferring] = useState(false);
  const { workspaces } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );
  const [verificationText, setVerificationText] = useState("");

  const { isMobile } = useMediaQuery();

  const transferDomain = async (domain: string, selectedWorkspace: string) => {
    setTransferring(true);
    const newWorkspaceId = workspaces?.find(
      (workspace) => workspace.slug === selectedWorkspace,
    )?.id;
    if (!newWorkspaceId) {
      toast.error("New workspace not found.");
      return;
    }

    return await fetch(
      `/api/domains/${domain}/transfer?workspaceId=${currentWorkspaceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newWorkspaceId }),
      },
    ).then(async (res) => {
      if (res.ok) {
        mutatePrefix("/api/domains");
        setShowTransferDomainModal(false);
        onSuccess?.();
      } else {
        const { error } = await res.json();
        toast.error(error.message || "Failed to transfer domain.");
      }

      setTransferring(false);
    });
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Transfer domain</h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to transfer this domain?
        </p>

        <p className="mt-4 text-sm font-medium text-neutral-800">
          Transferring a domain will fully reset the stats for all associated
          links and is irreversible – please proceed with caution.
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          <div className="flex items-center space-x-2 rounded-lg bg-white p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
              <Globe className="size-4 rounded-full" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">{domain}</p>
            </div>
          </div>
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
            await transferDomain(domain, selectedWorkspace);
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
            <span className="font-semibold">confirm transfer domain</span> below
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm transfer domain"
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
            onClick={() => setShowTransferDomainModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            disabled={
              !selectedWorkspace ||
              verificationText !== "confirm transfer domain"
            }
            loading={transferring}
            text="Transfer domain"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useTransferDomainModal({
  props,
  onSuccess,
}: {
  props: DomainProps;
  onSuccess?: () => void;
}) {
  const [showTransferDomainModal, setShowTransferDomainModal] = useState(false);

  const TransferDomainModalCallback = useCallback(() => {
    return props ? (
      <TransferDomainModal
        showTransferDomainModal={showTransferDomainModal}
        setShowTransferDomainModal={setShowTransferDomainModal}
        props={props}
        onSuccess={onSuccess}
      />
    ) : null;
  }, [showTransferDomainModal, setShowTransferDomainModal]);

  return useMemo(
    () => ({
      setShowTransferDomainModal,
      TransferDomainModal: TransferDomainModalCallback,
    }),
    [setShowTransferDomainModal, TransferDomainModalCallback],
  );
}
