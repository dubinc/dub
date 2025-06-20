"use client";

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { qrTypeDataHandlers } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { getQRValidationSchema } from "@/ui/qr-builder/qr-validation-schema.ts";
import { useQrSave } from "@/ui/qr-code/hooks/use-qr-save.ts";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Button, Modal } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Theme } from "@radix-ui/themes";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { fileToBase64 } from "@/ui/utils/file-to-base64";

const getModalTitle = (qrType: EQRType): string => {
  switch (qrType) {
    case EQRType.WEBSITE:
      return "Edit Website URL";
    case EQRType.APP_LINK:
    case EQRType.SOCIAL:
    case EQRType.FEEDBACK:
      return "Edit URL";
    case EQRType.PDF:
      return "Update PDF";
    case EQRType.IMAGE:
      return "Update Image";
    case EQRType.VIDEO:
      return "Update Video";
    case EQRType.WHATSAPP:
      return "Edit Whatsapp Number";
    case EQRType.WIFI:
      return "Change Wifi settings";
    default:
      return "Edit QR Content";
  }
};

export type QRContentEditorData = Record<string, string | File[] | undefined>;

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
  if (!showQRContentEditorModal) {
    return null;
  }

  const selectedQRType = (qrCode?.qrType as EQRType) || EQRType.WEBSITE;

  const { initialInputValues } = useQrCustomization(qrCode);
  const { updateQr } = useQrSave();

  const validationSchema = getQRValidationSchema(selectedQRType);

  const methods = useForm<QRContentEditorData>({
    resolver: zodResolver(validationSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    const hasFileData = Object.values(initialInputValues).some(
      (value) =>
        Array.isArray(value) && value.length > 0 && value[0] instanceof File,
    );
    const hasOtherData = Object.values(initialInputValues).some(
      (value) => typeof value === "string" && value.length > 0,
    );

    if (!hasFileData && !hasOtherData) {
      return;
    }

    const values = {
      ...initialInputValues,
      [`qrName-${selectedQRType}`]: qrCode?.title || "QR Code",
    };
    methods.reset(values);
  }, [initialInputValues, qrCode?.title, selectedQRType, methods]);

  const [isHiddenNetwork, setIsHiddenNetwork] = useState(false);

  useEffect(() => {
    if (initialInputValues?.isHiddenNetwork) {
      setIsHiddenNetwork(initialInputValues.isHiddenNetwork === "true");
    }
  }, [initialInputValues?.isHiddenNetwork]);

  const handleSaveQR = async (formData: QRContentEditorData) => {
    if (!qrCode?.id) {
      toast.error("QR Code ID not found");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Form data:", formData);
      console.log("QR Type:", selectedQRType);
      console.log("Hidden network:", isHiddenNetwork);

      const { qrName, ...filteredFormData } = formData;

      if (selectedQRType === EQRType.WHATSAPP && filteredFormData.number) {
        filteredFormData.number = (filteredFormData.number as string).replace(
          /^\+/,
          "",
        );
      }

      const qrDataString = qrTypeDataHandlers[selectedQRType]?.(
        filteredFormData as Record<string, string>,
        isHiddenNetwork,
      );

      console.log("Generated QR data string:", qrDataString);

      if (!qrDataString) {
        toast.error("Failed to generate QR data");
        return;
      }

      // Convert File objects to base64 strings
      let file: string | undefined;
      let fileName: string | undefined;

      if (formData.filesImage && formData.filesImage.length > 0) {
        file = await fileToBase64(formData.filesImage[0] as File);
        fileName = (formData.filesImage[0] as File).name;
      } else if (formData.filesPDF && formData.filesPDF.length > 0) {
        file = await fileToBase64(formData.filesPDF[0] as File);
        fileName = (formData.filesPDF[0] as File).name;
      } else if (formData.filesVideo && formData.filesVideo.length > 0) {
        file = await fileToBase64(formData.filesVideo[0] as File);
        fileName = (formData.filesVideo[0] as File).name;
      }

      const updateData = {
        data: qrDataString,
        qrType: selectedQRType,
        ...(file && { file }),
        ...(fileName && { fileName }),
      };

      console.log("Sending update data:", updateData);

      const success = await updateQr(qrCode.id, updateData);

      if (success) {
        setShowQRContentEditorModal(false);
        // toast.success уже показывается в useQrSave
      }
    } catch (error) {
      console.error("Failed to update QR code:", error);
      toast.error("Failed to update QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowQRContentEditorModal(false);
      methods.reset({});
      setIsHiddenNetwork(false);
    }
  };

  const validateFields = async () => {
    const isValid = await methods.trigger();

    if (isValid) {
      const formData = methods.getValues();
      handleSaveQR(formData);
    } else {
      const errors = methods.formState.errors;
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        toast.error(firstError.message as string);
      }
    }
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
      <Theme>
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
            <div className="flex items-center gap-2">
              <QRIcon className="text-primary h-5 w-5" />
              <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
                {getModalTitle(selectedQRType)}
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
                  onClick={() => validateFields()}
                  loading={isProcessing}
                  text="Save Changes"
                />
              </div>
            </FormProvider>
          </div>
        </div>
      </Theme>
    </Modal>
  );
}

export function useQRContentEditor(data?: { qrCode?: ResponseQrCode }) {
  const [showQRContentEditorModal, setShowQRContentEditorModal] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const QRContentEditorModalCallback = useCallback(() => {
    return (
      <QRContentEditorModal
        qrCode={data?.qrCode}
        showQRContentEditorModal={showQRContentEditorModal}
        setShowQRContentEditorModal={setShowQRContentEditorModal}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    );
  }, [data?.qrCode, showQRContentEditorModal, isProcessing]);

  return useMemo(
    () => ({
      setShowQRContentEditorModal,
      QRContentEditorModal: QRContentEditorModalCallback,
    }),
    [setShowQRContentEditorModal, QRContentEditorModalCallback],
  );
}
