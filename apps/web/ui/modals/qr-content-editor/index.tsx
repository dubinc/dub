"use client";

import { EQRType, QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

export type QRContentEditorData = {
  title?: string;
  url?: string;
  // TODO: Добавить другие поля для редактирования
};

type QRContentEditorModalProps = {
  qrCode?: ResponseQrCode;
  showQRContentEditorModal: boolean;
  setShowQRContentEditorModal: Dispatch<SetStateAction<boolean>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
};

export function QRContentEditorModal({
  qrCode,
  showQRContentEditorModal,
  setShowQRContentEditorModal,
  isProcessing,
  setIsProcessing,
}: QRContentEditorModalProps) {
  const selectedQRType = (qrCode?.qrType as EQRType) || EQRType.WEBSITE;
  const currentQrTypeInfo = QR_TYPES.find(
    (item) => item.id === selectedQRType,
  )!;

  const { initialInputValues } = useQrCustomization(qrCode);

  const methods = useForm({
    defaultValues: {
      ...initialInputValues,
    },
  });

  const [isHiddenNetwork, setIsHiddenNetwork] = useState(
    initialInputValues?.isHiddenNetwork === "true" || false,
  );

  const handleSaveQR = async (data: any) => {
    setIsProcessing(true);

    try {
      // TODO: Implement actual save logic
      console.log("Saving QR data:", data);
      toast.success("QR code updated successfully");
      setShowQRContentEditorModal(false);
    } catch (error) {
      toast.error("Failed to update QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowQRContentEditorModal(false);
    }
  };

  const validateFields = () => {
    // TODO: Implement field validation
    const formData = methods.getValues();
    handleSaveQR(formData);
  };

  const handleHiddenNetworkChange = (checked: boolean) => {
    setIsHiddenNetwork(checked);
  };

  return (
    <Modal
      showModal={showQRContentEditorModal}
      setShowModal={setShowQRContentEditorModal}
      className="border-border-500 h-fit transition-[height] duration-[300ms]"
    >
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <QRIcon className="text-primary h-5 w-5" />
            <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
              Edit QR Content - {qrCode?.title ?? qrCode?.id}
            </h3>
          </div>
          <button
            disabled={isProcessing}
            type="button"
            onClick={handleClose}
            className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <FormProvider {...methods}>
            {/* QR Content Builder */}
            <QRCodeContentBuilder
              qrType={selectedQRType}
              isHiddenNetwork={isHiddenNetwork}
              onHiddenNetworkChange={handleHiddenNetworkChange}
              validateFields={validateFields}
              minimalFlow={true}
              hideNameField={true}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
                text="Cancel"
              />
              <Button
                type="button"
                onClick={validateFields}
                loading={isProcessing}
                text="Save Changes"
              />
            </div>
          </FormProvider>
        </div>
      </div>
    </Modal>
  );
}

export function useQRContentEditor(data?: { qrCode?: ResponseQrCode }) {
  const { qrCode } = data ?? {};

  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRContentEditorModal, setShowQRContentEditorModal] =
    useState(false);

  const QRContentEditorModalCallback = useCallback(() => {
    return (
      <QRContentEditorModal
        qrCode={qrCode}
        showQRContentEditorModal={showQRContentEditorModal}
        setShowQRContentEditorModal={setShowQRContentEditorModal}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    );
  }, [
    qrCode,
    showQRContentEditorModal,
    setShowQRContentEditorModal,
    isProcessing,
    setIsProcessing,
  ]);

  return useMemo(
    () => ({
      QRContentEditorModal: QRContentEditorModalCallback,
      setShowQRContentEditorModal,
      isProcessing,
    }),
    [QRContentEditorModalCallback, setShowQRContentEditorModal, isProcessing],
  );
}
