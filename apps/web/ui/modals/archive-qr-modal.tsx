import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { Button, Modal } from "@dub/ui";
import { Flex, Text, Theme } from "@radix-ui/themes";
import {
  Dispatch,
  MouseEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { X } from "@/ui/shared/icons";
import { Check } from 'lucide-react';

type ArchiveQRModalProps = {
  showArchiveQRModal: boolean;
  setShowArchiveQRModal: Dispatch<SetStateAction<boolean>>;
  props: QrStorageData;
};

function ArchiveQRModal({ showArchiveQRModal, setShowArchiveQRModal, props }: ArchiveQRModalProps) {
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

  const handleClose = () => {
    setShowArchiveQRModal(false);
  };

  return (
    <Modal
      showModal={showArchiveQRModal}
      setShowModal={setShowArchiveQRModal}
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
                {props.archived ? "Are you sure you want to unpause" : "Are you sure you want to pause"} "{props.title}"?
              </h3>
            </div>
            <button
              disabled={archiving}
              type="button"
              onClick={handleClose}
              className="active:bg-border-500 group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:right-0 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4">
              {!props.archived && (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  gap={{ initial: "2", lg: "3" }}
                  className="bg-primary-200 rounded-lg p-3 lg:p-3.5"
                >
                  <Flex
                    direction="row"
                    align="center"
                    className="w-full gap-1.5"
                  >
                    <Check className="text-primary h-[18px] w-[18px]" strokeWidth={2} />
                    <Text
                      as="span"
                      size={{ initial: "1", lg: "2" }}
                      className="text-neutral"
                    >
                      New scans won’t open the destination.
                    </Text>
                  </Flex>
                  <Flex
                    direction="row"
                    align="center"
                    className="w-full gap-1.5"
                  >
                    <Check className="text-primary h-[18px] w-[18px]" strokeWidth={2} />
                    <Text
                      as="span"
                      size={{ initial: "1", lg: "2" }}
                      className="text-neutral"
                    >
                      Analytics won’t be recorded while paused.
                    </Text>
                  </Flex>
                  <Flex
                    direction="row"
                    align="center"
                    className="w-full gap-1.5"
                  >
                    <Check className="text-primary h-[18px] w-[18px]" strokeWidth={2} />
                    <Text
                      as="span"
                      size={{ initial: "1", lg: "2" }}
                      className="text-neutral"
                    >
                      You can resume at any time.
                    </Text>
                  </Flex>
                </Flex>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={archiving}
                  text="Cancel"
                />
                <Button
                  type="button"
                  onClick={handleArchiveRequest}
                  loading={archiving}
                  text={props.archived ? "Confirm unpause" : "Confirm pause"}
                />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </Modal>
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
