import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { Button, Modal } from "@dub/ui";
import { Flex, Text, Theme } from "@radix-ui/themes";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useState,
} from "react";
import { X } from "@/ui/shared/icons";
import { CircleAlert } from 'lucide-react';

type ArchiveQRModalProps = {
  isOpen: boolean;
  onToggleModal: Dispatch<SetStateAction<boolean>>;
  props: QrStorageData;
};

function ResetScansModal({ isOpen, onToggleModal, props }: ArchiveQRModalProps) {
  const { resetScans } = useQrOperations();
  const [loading, setLoading] = useState(false);

  const handleArchiveRequest = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    setLoading(true);
    const success = await resetScans(props.id);
    setLoading(false);

    if (success) {
      onToggleModal(false);
    }
  };

  const handleClose = () => {
    onToggleModal(false);
  };

  return (
    <Modal
      showModal={isOpen}
      setShowModal={onToggleModal}
      className="border-border-500 md:max-w-md"
      drawerRootProps={{
        repositionInputs: false,
      }}
    >
      <Theme>
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-center px-2 py-4 relative">
            <h3 className="!mt-0 max-w-xs text-lg font-semibold text-center">
              Are you sure you want to reset
              <br />
              scans for "{props.title}"?
            </h3>
            <button
              disabled={loading}
              type="button"
              onClick={handleClose}
              className="active:bg-border-500 group absolute right-6 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Flex
                  direction="row"
                  align="center"
                  className="w-full gap-2"
                >
                  <CircleAlert className="text-amber-600 h-[18px] w-[18px]" strokeWidth={2} />
                  <Text
                    as="span"
                    size={{ initial: "1", lg: "2" }}
                  >
                    All scan statistics for this QR code will be deleted.
                    <br />
                    This can't be undone.
                  </Text>
                </Flex>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  text="Cancel"
                />
                <Button
                  type="button"
                  variant="warning"
                  onClick={handleArchiveRequest}
                  loading={loading}
                  text="Confirm reset"
                />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </Modal>
  );
}

export function useResetScansModal({ props }: { props: QrStorageData }) {
  const [isOpen, setIsOpen] = useState(false);

  const ResetScansModalCallback = useCallback(() => {
    return props ? (
      <ResetScansModal
        isOpen={isOpen}
        onToggleModal={setIsOpen}
        props={props}
      />
    ) : null;
  }, [isOpen, setIsOpen]);

  return { isOpen, handleToggleModal: setIsOpen, ResetScansModal: ResetScansModalCallback };
}
