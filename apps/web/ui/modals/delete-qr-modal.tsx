import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { QRProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

type DeleteQRModalProps = {
  showDeleteQRModal: boolean;
  setShowDeleteQRModal: Dispatch<SetStateAction<boolean>>;
  props: QRProps;
};

function DeleteQRModal(props: DeleteQRModalProps) {
  return (
    <Modal
      showModal={props.showDeleteQRModal}
      setShowModal={props.setShowDeleteQRModal}
    >
      <DeleteQrModalInner {...props} />
    </Modal>
  );
}

function DeleteQrModalInner({
  setShowDeleteQRModal,
  props,
}: DeleteQRModalProps) {
  const { id } = useWorkspace();
  const [deleting, setDeleting] = useState(false);

  const { isMobile } = useMediaQuery();

  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 text-center sm:px-16">
        <h3 className="text-lg font-medium">Delete {props.id}</h3>
        <p className="text-sm text-neutral-500">
          Warning: Deleting this QR will remove all of its analytics. This
          action cannot be undone – proceed with caution.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setDeleting(true);
          fetch(`/api/qrs/${props.id}?workspaceId=${id}`, {
            method: "DELETE",
          }).then(async (res) => {
            if (res.status === 200) {
              await mutatePrefix("/api/qrs");
              setShowDeleteQRModal(false);
              toast.success("Successfully deleted QR!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
            setDeleting(false);
          });
        }}
        className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type <span className="font-semibold">{props.id}</span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={props.id}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <Button variant="danger" text="Confirm delete" loading={deleting} />
      </form>
    </>
  );
}

export function useDeleteQRModal({ props }: { props?: QRProps }) {
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
