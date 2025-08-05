"use client";

import { convertQrStorageDataToBuilder } from "@/ui/qr-builder/helpers/data-converters.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr";
import { Button, Input, Modal } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface QRRenameModalProps {
  qrCode: QrStorageData;
  showQRRenameModal: boolean;
  setShowQRRenameModal: Dispatch<SetStateAction<boolean>>;
}

function QRRenameModal({
  qrCode,
  showQRRenameModal,
  setShowQRRenameModal,
}: QRRenameModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [name, setName] = useState(qrCode.title || "");
  const { updateQrWithOriginal } = useQrOperations();

  const handleSave = async () => {
    if (!qrCode?.id) {
      toast.error("QR Code id not found");
      return;
    }

    if (name === qrCode.title) {
      setShowQRRenameModal(false);
      return;
    }

    setIsProcessing(true);

    try {
      const qrBuilderData = convertQrStorageDataToBuilder(qrCode);
      qrBuilderData.title = name;

      const success = await updateQrWithOriginal(qrCode, qrBuilderData);

      if (success) {
        setShowQRRenameModal(false);
      }
    } catch (error) {
      console.error("Failed to rename QR code:", error);
      toast.error("Failed to rename QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowQRRenameModal(false);
      setName(qrCode.title || "");
    }
  };

  return (
    <Modal
      showModal={showQRRenameModal}
      setShowModal={setShowQRRenameModal}
      className="border-border-500 max-w-md"
      drawerRootProps={{
        repositionInputs: false,
      }}
    >
      <Theme>
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
            <div className="flex items-center gap-2">
              <QRIcon className="text-primary h-5 w-5" />
              <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
                Rename QR Code
              </h3>
            </div>
            <button
              disabled={isProcessing}
              type="button"
              onClick={handleClose}
              className="active:bg-border-500 group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none md:right-0 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Enter QR code name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSave();
                  }
                }}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                  text="Cancel"
                />
                <Button
                  type="button"
                  onClick={handleSave}
                  loading={isProcessing}
                  text="Save Changes"
                />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </Modal>
  );
}

export function useQRRenameModal(data: { qrCode: QrStorageData }) {
  const { qrCode } = data;
  const [showQRRenameModal, setShowQRRenameModal] = useState(false);

  const QRRenameModalCallback = useCallback(() => {
    return (
      <QRRenameModal
        qrCode={qrCode}
        showQRRenameModal={showQRRenameModal}
        setShowQRRenameModal={setShowQRRenameModal}
      />
    );
  }, [qrCode, showQRRenameModal]);

  return useMemo(
    () => ({
      QRRenameModal: QRRenameModalCallback,
      setShowQRRenameModal,
    }),
    [QRRenameModalCallback],
  );
}
