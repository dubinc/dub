"use client";

import { useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import { useCallback, useState } from "react";
import { Drawer } from "vaul";

import { QRBuilderNew } from "@/ui/qr-builder-new";
import { TQrServerData } from "@/ui/qr-builder-new/helpers/data-converters";
import { useNewQrOperations } from "@/ui/qr-builder-new/hooks/use-qr-operations";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Modal } from "@dub/ui";
import { LoaderCircle } from "lucide-react";

interface QRBuilderModalProps {
  qrData?: TQrServerData;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export function QRBuilderModal({
  qrData,
  showModal,
  setShowModal,
}: QRBuilderModalProps) {
  const { createQr, updateQr } = useNewQrOperations();
  const { isMobile } = useMediaQuery();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveQR = async (data: any) => {
    setIsProcessing(true);

    try {
      if (qrData) {
        await updateQr(qrData, data);
      } else {
        await createQr(data);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving QR:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="flex h-full flex-col gap-2 overflow-y-auto bg-white md:h-fit">
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm">
          <LoaderCircle className="text-secondary h-8 w-8 animate-spin" />
        </div>
      )}
      <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
        <div className="flex items-center gap-2">
          <QRIcon className="text-primary h-5 w-5" />
          <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
            {qrData ? `Edit QR - ${qrData.title ?? qrData.id}` : "New QR"}
          </h3>
        </div>
        <button
          onClick={() => setShowModal(false)}
          disabled={isProcessing}
          type="button"
          className="active:bg-border-500 group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:right-0 md:block"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Theme>
        <QRBuilderNew initialQrData={qrData} onSave={handleSaveQR} />
      </Theme>
    </div>
  );

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setShowModal(false);
    }
  }, [isProcessing, setShowModal]);

  useKeyboardShortcut("Escape", handleClose);

  if (isMobile) {
    return (
      <Drawer.Root
        open={showModal}
        onOpenChange={setShowModal}
        dismissible={false}
        repositionInputs={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex !h-[100dvh] !max-h-[100dvh] !min-h-[100dvh] flex-col rounded-t-[10px] bg-white">
            <div className="flex-1 overflow-y-auto">{modalContent}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      desktopOnly
      className="border-border-500 w-full max-w-6xl overflow-hidden"
    >
      {modalContent}
    </Modal>
  );
}
