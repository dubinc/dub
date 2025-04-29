import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps, QRProps } from "@/lib/types";
import { Button, Modal, useToastWithUndo } from "@dub/ui";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

const sendArchiveRequest = ({
  qrId,
  archive,
  workspaceId,
}: {
  qrId: string;
  archive: boolean;
  workspaceId?: string;
}) => {
  return fetch(`/api/qrs/${qrId}?workspaceId=${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify({ archived: archive }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

type ArchiveQRModalProps = {
  showArchiveQRModal: boolean;
  setShowArchiveQRModal: Dispatch<SetStateAction<boolean>>;
  props: QRProps & {
    link: LinkProps;
  };
};

function ArchiveQRModal(props: ArchiveQRModalProps) {
  return (
    <Modal
      showModal={props.showArchiveQRModal}
      setShowModal={props.setShowArchiveQRModal}
    >
      <ArchiveQRModalInner {...props} />
    </Modal>
  );
}

function ArchiveQRModalInner({
  setShowArchiveQRModal,
  props,
}: ArchiveQRModalProps) {
  const toastWithUndo = useToastWithUndo();

  const { id: workspaceId } = useWorkspace();
  const [archiving, setArchiving] = useState(false);

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const res = await sendArchiveRequest({
      qrId: props.id,
      archive: !props.link.archived,
      workspaceId,
    });
    setArchiving(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error.message);
      return;
    }

    mutatePrefix(["/api/qrs", "/api/links"]);
    setShowArchiveQRModal(false);
    toastWithUndo({
      id: "qr-archive-undo-toast",
      message: `Successfully ${props.link.archived ? "unpaused" : "paused"} QR!`,
      undo: undoAction,
      duration: 5000,
    });
  };

  const undoAction = () => {
    toast.promise(
      sendArchiveRequest({
        qrId: props.id,
        archive: props.link.archived,
        workspaceId,
      }),
      {
        loading: "Undo in progress...",
        error: "Failed to roll back changes. An error occurred.",
        success: () => {
          mutatePrefix(["/api/qrs", "/api/links"]);
          return "Undo successful! Changes reverted.";
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 text-center sm:px-16">
        <h3 className="text-lg font-medium">
          {props.link.archived ? "Unpause" : "Pause"} {props.id}
        </h3>
        {/*<p className="text-sm text-neutral-500">*/}
        {/*  {props.archived*/}
        {/*    ? "By unpausing this qr, it will show up on your main dashboard again."*/}
        {/*    : "Paused QRs will still work - they just won't show up on your main dashboard."}*/}
        {/*</p>*/}
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={handleArchiveRequest}
          autoFocus
          loading={archiving}
          text={`Confirm ${props.link.archived ? "unpause" : "pause"}`}
        />
      </div>
    </>
  );
}

export function useArchiveQRModal({
  props,
}: {
  props: QRProps & {
    link: LinkProps;
  };
}) {
  const [showArchiveQRModal, setShowArchiveQRModal] = useState(false);

  const ArchiveQRModalCallback = useCallback(() => {
    return props ? (
      <ArchiveQRModal
        showArchiveQRModal={showArchiveQRModal}
        setShowArchiveQRModal={setShowArchiveQRModal}
        props={props}
      />
    ) : null;
  }, [showArchiveQRModal, setShowArchiveQRModal]);

  return useMemo(
    () => ({
      setShowArchiveQRModal,
      ArchiveQRModal: ArchiveQRModalCallback,
    }),
    [setShowArchiveQRModal, ArchiveQRModalCallback],
  );
}
