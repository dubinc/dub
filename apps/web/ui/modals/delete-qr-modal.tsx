import { QrStorageData } from "@/lib/qr-types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type DeleteQRModalProps = {
  showDeleteQRModal: boolean;
  setShowDeleteQRModal: Dispatch<SetStateAction<boolean>>;
  props: QrStorageData;
};

function DeleteQRModal(props: DeleteQRModalProps) {
  return (
    <Modal
      showModal={props.showDeleteQRModal}
      setShowModal={props.setShowDeleteQRModal}
      className="border-border-500"
    >
      <DeleteQrModalInner {...props} />
    </Modal>
  );
}

function DeleteQrModalInner({
  setShowDeleteQRModal,
  props,
}: DeleteQRModalProps) {
  const { deleteQr } = useQrOperations();
  const [deleting, setDeleting] = useState(false);

  // const { isMobile } = useMediaQuery();

  return (
    <>
      <div className="border-border-500 flex flex-col items-center justify-center space-y-3 border-b px-4 py-4 pt-8 text-center sm:px-16">
        <h3 className="text-lg font-medium">
          This QR code will be removed. <br /> Are you sure?
        </h3>
        {/*<p className="text-sm text-neutral-500">*/}
        {/*  Warning: Deleting this QR will remove all of its analytics. This*/}
        {/*  action cannot be undone – proceed with caution.*/}
        {/*</p>*/}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setDeleting(true);
          const success = await deleteQr(props.id);
          setDeleting(false);

          if (success) {
            setShowDeleteQRModal(false);
          }
        }}
        className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16"
      >
        <Button
          variant="danger"
          text="Confirm delete"
          loading={deleting}
          className="border-border-500"
        />
      </form>
    </>
  );
}

export function useDeleteQRModal({ props }: { props?: QrStorageData }) {
  const [showDeleteQRModal, setShowDeleteQRModal] = useState(false);

  const DeleteLinkModalCallback = useCallback(() => {
    return props ? (
      <DeleteQRModal
        showDeleteQRModal={showDeleteQRModal}
        setShowDeleteQRModal={setShowDeleteQRModal}
        props={props}
      />
    ) : null;
  }, [showDeleteQRModal, setShowDeleteQRModal]);

  return useMemo(
    () => ({
      setShowDeleteQRModal,
      DeleteLinkModal: DeleteLinkModalCallback,
    }),
    [setShowDeleteQRModal, DeleteLinkModalCallback],
  );
}
