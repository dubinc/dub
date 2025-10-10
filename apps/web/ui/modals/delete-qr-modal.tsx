import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { X } from "@/ui/shared/icons";
import { Button, Modal } from "@dub/ui";
import { Flex, Text, Theme } from "@radix-ui/themes";
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

function DeleteQRModal({
  showDeleteQRModal,
  setShowDeleteQRModal,
  props,
}: DeleteQRModalProps) {
  const { deleteQr } = useQrOperations();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const success = await deleteQr(props.id);
    setDeleting(false);

    if (success) {
      setShowDeleteQRModal(false);
    }
  }, [deleteQr, props.id, setShowDeleteQRModal]);

  const handleClose = () => {
    setShowDeleteQRModal(false);
  };

  return (
    <Modal
      showModal={showDeleteQRModal}
      setShowModal={setShowDeleteQRModal}
      className="border-border-500 max-w-md"
      drawerRootProps={{
        repositionInputs: false,
      }}
    >
      <Theme>
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
            <div className="flex items-center gap-2">
              <h3 className="!mt-0 max-w-xs text-lg font-medium">
                Are you sure you want to delete "{props.title}"?
              </h3>
            </div>
            <button
              disabled={deleting}
              type="button"
              onClick={handleClose}
              className="active:bg-border-500 group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:right-0 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4">
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap={{ initial: "2", lg: "3" }}
                className="rounded-lg bg-red-100 p-3 lg:p-3.5"
              >
                <Flex direction="row" align="center" className="w-full gap-1.5">
                  <X className="h-[18px] w-[18px] text-red-800" />
                  <Text
                    as="span"
                    size={{ initial: "1", lg: "2" }}
                    className="text-red-600"
                  >
                    This permanently removes the QR code.
                  </Text>
                </Flex>
                <Flex direction="row" align="center" className="w-full gap-1.5">
                  <X className="h-[18px] w-[18px] text-red-800" />
                  <Text
                    as="span"
                    size={{ initial: "1", lg: "2" }}
                    className="text-red-600"
                  >
                    Future scans will not work.
                  </Text>
                </Flex>
                <Flex direction="row" align="center" className="w-full gap-1.5">
                  <X className="h-[18px] w-[18px] text-red-800" />
                  <Text
                    as="span"
                    size={{ initial: "1", lg: "2" }}
                    className="text-red-600"
                  >
                    All analytics for this code will be deleted.
                  </Text>
                </Flex>
              </Flex>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={deleting}
                  text="Cancel"
                />
                <Button
                  type="button"
                  onClick={handleDelete}
                  loading={deleting}
                  text="Confirm delete"
                />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </Modal>
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
