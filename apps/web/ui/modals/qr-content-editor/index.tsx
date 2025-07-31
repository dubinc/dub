"use client";

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { convertQrStorageDataToBuilderWithPartialUpdate } from "@/ui/qr-builder/helpers/data-converters.ts";
import { qrTypeDataHandlers } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { getQRValidationSchema } from "@/ui/qr-builder/qr-validation-schema.ts";
import {
  QRPartialUpdateData,
  QrStorageData,
} from "@/ui/qr-builder/types/types.ts";
import { useQrOperations } from "@/ui/qr-code/hooks/use-qr-operations";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Button, Modal } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Theme } from "@radix-ui/themes";
import { LoaderCircle } from "lucide-react";
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
  qrCode?: QrStorageData;
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

  const { parsedInputValues } = useQrCustomization(qrCode);
  const { updateQrWithOriginal } = useQrOperations();

  const validationSchema = getQRValidationSchema(selectedQRType);

  const methods = useForm<QRContentEditorData>({
    defaultValues: {},
    resolver: zodResolver(validationSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    const valuesWithQrName = {
      ...parsedInputValues,
      [`qrName-${selectedQRType}`]: qrCode?.title || "QR Code",
    };

    methods.reset(valuesWithQrName);
  }, [parsedInputValues, methods, qrCode, selectedQRType]);

  const [isHiddenNetwork, setIsHiddenNetwork] = useState(false);

  useEffect(() => {
    if (parsedInputValues?.isHiddenNetwork) {
      setIsHiddenNetwork(parsedInputValues.isHiddenNetwork === "true");
    }
  }, [parsedInputValues?.isHiddenNetwork]);

  const handleSaveQR = async (formData: QRContentEditorData) => {
    if (!qrCode?.id) {
      toast.error("QR Code ID not found");
      return;
    }

    setIsProcessing(true);

    try {
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

      if (!qrDataString) {
        toast.error("Failed to generate QR data");
        return;
      }

      const partialUpdate: QRPartialUpdateData = {
        title: formData.qrName as string,
        data: qrDataString,
        fileId: formData.fileId as string,
      };

      const qrBuilderData = convertQrStorageDataToBuilderWithPartialUpdate(
        qrCode,
        partialUpdate,
      );

      const success = await updateQrWithOriginal(qrCode, qrBuilderData);

      if (success) {
        setShowQRContentEditorModal(false);
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
    console.log("Validating form...");
    const isValid = await methods.trigger();
    console.log("Form validation result:", isValid);

    if (isValid) {
      const formData = methods.getValues();
      console.log("Form data to save:", formData);
      handleSaveQR(formData);
    } else {
      const errors = methods.formState.errors;
      console.log("Validation errors:", errors);

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
      drawerRootProps={{
        dismissible: false,
      }}
      className="border-border-500 h-fit transition-[height] duration-[300ms]"
    >
      <Theme>
        <div className="flex flex-col gap-2">
          {isProcessing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm">
              <LoaderCircle className="text-secondary h-8 w-8 animate-spin" />
            </div>
          )}
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
                homePageDemo
                hideNameField
                isEdit
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

export function useQRContentEditor(data?: { qrCode?: QrStorageData }) {
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
