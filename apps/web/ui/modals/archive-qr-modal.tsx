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
import { CircleAlert, CircleCheck } from 'lucide-react';

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
      className="border-border-500 md:max-w-md"
      drawerRootProps={{
        repositionInputs: false,
      }}
    >
      <Theme>
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-center px-2 py-4 relative">
            <h3 className="!mt-0 max-w-xs text-lg font-semibold text-center">
              {props.archived ? "Are you sure you want to resume" : "Are you sure you want to pause"}
              <br />
              "{props.title}"?
            </h3>
            <button
              disabled={archiving}
              type="button"
              onClick={handleClose}
              className="active:bg-border-500 group absolute right-6 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-6">
              {!props.archived
                ? (
                  <div className="flex flex-col gap-2">
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleAlert className="text-amber-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        New scans won’t open the destination.
                      </Text>
                    </Flex>
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleAlert className="text-amber-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        Analytics won’t be recorded while paused.
                      </Text>
                    </Flex>
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleAlert className="text-amber-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        You can resume at any time.
                      </Text>
                    </Flex>
                  </div>
                )
                : (
                  <div className="flex flex-col gap-2">
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleCheck className="text-green-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        New scans will open the destination again.
                      </Text>
                    </Flex>
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleCheck className="text-green-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        Analytics will start recording from now on.
                      </Text>
                    </Flex>
                    <Flex
                      direction="row"
                      align="center"
                      className="w-full gap-1.5"
                    >
                      <CircleCheck className="text-green-600 h-[18px] w-[18px]" strokeWidth={2} />
                      <Text
                        as="span"
                        size={{ initial: "1", lg: "2" }}
                      >
                        You can pause this code at any time.
                      </Text>
                    </Flex>
                  </div>
                )
              }

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
                  variant={props.archived ? "primary" : "warning"}
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
