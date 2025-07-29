import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type ArchiveQRModalProps = {
  showArchiveQRModal: boolean;
  setShowArchiveQRModal: Dispatch<SetStateAction<boolean>>;
  props: QrStorageData;
};

function ArchiveQRModal(props: ArchiveQRModalProps) {
  return (
    <Modal
      showModal={props.showArchiveQRModal}
      setShowModal={props.setShowArchiveQRModal}
      className="border-border-500"
    >
      <ArchiveQRModalInner {...props} />
    </Modal>
  );
}

function ArchiveQRModalInner({
  setShowArchiveQRModal,
  props,
}: ArchiveQRModalProps) {
  const { archiveQr } = useQrOperations();
  const [archiving, setArchiving] = useState(false);

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setArchiving(true);
    const success = await archiveQr(props.id, !props.archived);
    setArchiving(false);

    if (success) {
      setShowArchiveQRModal(false);
    }
  };

  return (
    <>
      <div className="border-border-500 flex flex-col items-center justify-center space-y-3 border-b px-4 py-4 pt-8 text-center sm:px-16">
        <h3 className="text-lg font-medium">
          {props.archived ? "Unpause" : "Pause"} "{props.title}"?
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
          text={`Confirm ${props.archived ? "unpause" : "pause"}`}
        />
      </div>
    </>
  );
}

export function useArchiveQRModal({ props }: { props: QrStorageData }) {
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
