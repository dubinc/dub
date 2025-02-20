import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Button, Modal, useToastWithUndo } from "@dub/ui";
import { capitalize, pluralize } from "@dub/utils";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { SimpleLinkCard } from "../links/simple-link-card";

const sendArchiveRequest = ({
  linkIds,
  archive,
  workspaceId,
}: {
  linkIds: string[];
  archive: boolean;
  workspaceId?: string;
}) => {
  return fetch(`/api/links/bulk?workspaceId=${workspaceId}`, {
    method: "PATCH",
    body: JSON.stringify({ linkIds, data: { archived: archive } }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

type ArchiveLinkModalProps = {
  showArchiveLinkModal: boolean;
  setShowArchiveLinkModal: Dispatch<SetStateAction<boolean>>;
  links: LinkProps[];
};

function ArchiveLinkModal(props: ArchiveLinkModalProps) {
  return (
    <Modal
      showModal={props.showArchiveLinkModal}
      setShowModal={props.setShowArchiveLinkModal}
    >
      <ArchiveLinkModalInner {...props} />
    </Modal>
  );
}

function ArchiveLinkModalInner({
  setShowArchiveLinkModal,
  links,
}: ArchiveLinkModalProps) {
  const toastWithUndo = useToastWithUndo();

  const archived = links.every((link) => link.archived);
  const actionText = archived ? "unarchive" : "archive";

  const { id: workspaceId } = useWorkspace();
  const [archiving, setArchiving] = useState(false);

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const res = await sendArchiveRequest({
      linkIds: links.map(({ id }) => id),
      archive: !archived,
      workspaceId,
    });
    setArchiving(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error.message);
      return;
    }

    mutatePrefix("/api/links");
    setShowArchiveLinkModal(false);
    toastWithUndo({
      id: "link-archive-undo-toast",
      message: `Successfully ${actionText}d ${pluralize("link", links.length)}!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(
      sendArchiveRequest({
        linkIds: links.map(({ id }) => id),
        archive: archived,
        workspaceId,
      }),
      {
        loading: "Undo in progress...",
        error: "Failed to roll back changes. An error occurred.",
        success: () => {
          mutatePrefix("/api/links");
          return "Undo successful! Changes reverted.";
        },
      },
    );
  };

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          {capitalize(actionText)}{" "}
          {links.length > 1 ? `${links.length} links` : "link"}
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          Are you sure you want to {actionText} the following{" "}
          {pluralize("link", links.length)}?
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          {links.map((link) => (
            <SimpleLinkCard key={link.id} link={link} />
          ))}
        </div>
      </div>

      {/* <LinkLogo apexDomain={getApexDomain(links[0].url)} /> */}

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowArchiveLinkModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleArchiveRequest}
          autoFocus
          loading={archiving}
          text={`${capitalize(actionText)} ${pluralize("link", links.length)}`}
          className="h-8 w-fit px-3"
        />
      </div>
    </>
  );
}

export function useArchiveLinkModal({
  props,
}: {
  props: LinkProps | LinkProps[];
}) {
  const [showArchiveLinkModal, setShowArchiveLinkModal] = useState(false);

  const ArchiveLinkModalCallback = useCallback(() => {
    return props ? (
      <ArchiveLinkModal
        showArchiveLinkModal={showArchiveLinkModal}
        setShowArchiveLinkModal={setShowArchiveLinkModal}
        links={Array.isArray(props) ? props : [props]}
      />
    ) : null;
  }, [showArchiveLinkModal, setShowArchiveLinkModal]);

  return useMemo(
    () => ({
      setShowArchiveLinkModal,
      ArchiveLinkModal: ArchiveLinkModalCallback,
    }),
    [setShowArchiveLinkModal, ArchiveLinkModalCallback],
  );
}
