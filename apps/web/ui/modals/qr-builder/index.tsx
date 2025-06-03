"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { Theme } from "@radix-ui/themes";

import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { QrBuilder } from "@/ui/qr-builder/qr-builder";
import { FullQrCreateData, useQrSave } from "@/ui/qr-code/hooks/use-qr-save";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { Modal } from "@dub/ui";
import { Options } from "qr-code-styling";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

export type QRBuilderData = {
  styles: Options;
  frameOptions: {
    id: string;
  };
  qrType: EQRType;
  files: File[];
};

type QRBuilderModalProps = {
  props?: ResponseQrCode;
  showQRBuilderModal: boolean;
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
  isProcessing: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
};

export function QRBuilderModal({
  props,
  showQRBuilderModal,
  setShowQRBuilderModal,
  isProcessing,
  setIsProcessing,
}: QRBuilderModalProps) {
  const { createQr, updateQr } = useQrSave();

  const handleSaveQR = async (data: QRBuilderData) => {
    setIsProcessing(true);

    if (data.styles.data === DEFAULT_WEBSITE) {
      setIsProcessing(false);
      toast.error("Data of QR Code not found.");
      return;
    }

    let response = false;

    if (props) {
      response = await updateQr(props.id, {
        data: data.styles.data,
        styles: data.styles,
        frameOptions: data.frameOptions,
        qrType: data.qrType,
        files: data.files,
      });
    } else {
      response = await createQr(data as FullQrCreateData);
    }

    setIsProcessing(false);
    if (response) {
      setShowQRBuilderModal(false);
    }
  };

  return (
    <Modal
      showModal={showQRBuilderModal}
      setShowModal={setShowQRBuilderModal}
      className="border-border-500 h-fit max-w-screen-lg transition-[height] duration-[300ms]"
    >
      <div className="flex flex-col gap-2">
        {/* header */}
        <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-2">
            <QRIcon className="text-primary h-5 w-5" />
            <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
              {props ? `Edit QR - ${props.title ?? props.id}` : "New QR"}
            </h3>
          </div>
          <button
            disabled={isProcessing}
            type="button"
            onClick={() => {
              setShowQRBuilderModal(false);
            }}
            className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Theme>
          <QrBuilder
            isEdit={!!props}
            isProcessing={isProcessing}
            props={props}
            handleSaveQR={handleSaveQR}
          />
        </Theme>
      </div>
    </Modal>
  );
}

type CreateQRButtonProps = {
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
};

export function CreateQRButton(props: CreateQRButtonProps) {
  useKeyboardShortcut("c", () => props.setShowQRBuilderModal(true));

  return (
    <Button
      text="Create QR code"
      onClick={() => props.setShowQRBuilderModal(true)}
    />
  );
}

export function useQRBuilder(data?: { props?: ResponseQrCode }) {
  const { props } = data ?? {};

  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRBuilderModal, setShowQRBuilderModal] = useState(false);

  const QRBuilderModalCallback = useCallback(() => {
    return (
      <QRBuilderModal
        props={props}
        showQRBuilderModal={showQRBuilderModal}
        setShowQRBuilderModal={setShowQRBuilderModal}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
      />
    );
  }, [
    props,
    showQRBuilderModal,
    setShowQRBuilderModal,
    isProcessing,
    setIsProcessing,
  ]);

  const CreateQRButtonCallback = useCallback(() => {
    return <CreateQRButton setShowQRBuilderModal={setShowQRBuilderModal} />;
  }, [setShowQRBuilderModal]);

  return useMemo(
    () => ({
      CreateQRButton: CreateQRButtonCallback,
      QRBuilderModal: QRBuilderModalCallback,
      setShowQRBuilderModal,
      isProcessing,
    }),
    [
      CreateQRButtonCallback,
      QRBuilderModalCallback,
      setShowQRBuilderModal,
      isProcessing,
    ],
  );
}
