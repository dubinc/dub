"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { Theme } from "@radix-ui/themes";
import { Options } from "qr-code-styling";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RemoveScroll } from "react-remove-scroll";
import { toast } from "sonner";

import useUser from "@/lib/swr/use-user.ts";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { QrBuilder } from "@/ui/qr-builder/qr-builder";
import { FullQrCreateData, useQrSave } from "@/ui/qr-code/hooks/use-qr-save";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr.tsx";
import { trackClientEvents } from "../../../core/integration/analytic";
import { EAnalyticEvents } from "../../../core/integration/analytic/interfaces/analytic.interface.ts";

export type QRBuilderData = {
  title: string;
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
  initialStep?: number;
};

export function QRBuilderModal({
  props,
  showQRBuilderModal,
  setShowQRBuilderModal,
  initialStep,
}: QRBuilderModalProps) {
  const { createQr, updateQr } = useQrSave();

  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showQRBuilderModal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showQRBuilderModal]);

  const handleSaveQR = async (data: QRBuilderData) => {
    setIsProcessing(true);

    if (data.styles.data === DEFAULT_WEBSITE) {
      setIsProcessing(false);
      toast.error("Data of QR Code not found.");
      return;
    }

    if (props) {
      await updateQr(props.id, {
        data: data.styles.data,
        styles: data.styles,
        frameOptions: data.frameOptions,
        qrType: data.qrType,
        files: data.files,
      });
    } else {
      await createQr(data as FullQrCreateData);
    }

    setIsProcessing(false);
    setShowQRBuilderModal(false);
  };

  return (
    <RemoveScroll enabled={showQRBuilderModal}>
      <dialog
        ref={dialogRef}
        onClose={() => setShowQRBuilderModal(false)}
        className="fixed h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-y-scroll rounded-none bg-transparent p-0 opacity-0 transition-opacity duration-300 ease-in-out backdrop:bg-black backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-300 open:opacity-100 open:backdrop:opacity-30 md:m-auto md:h-auto md:w-full md:max-w-screen-lg md:scale-95 md:rounded-lg md:transition-all open:md:scale-100"
      >
        <div className="bg-background flex h-full flex-col gap-2 overflow-y-auto md:h-fit">
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
              onClick={() => setShowQRBuilderModal(false)}
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
              initialStep={initialStep}
            />
          </Theme>
        </div>
      </dialog>
    </RemoveScroll>
  );
}

type CreateQRButtonProps = {
  setShowQRBuilderModal: Dispatch<SetStateAction<boolean>>;
};

export function CreateQRButton(props: CreateQRButtonProps) {
  const { user } = useUser();

  useKeyboardShortcut("c", () => props.setShowQRBuilderModal(true));

  return (
    <Button
      text="Create QR code"
      onClick={() => {
        trackClientEvents({
          event: EAnalyticEvents.PAGE_CLICKED,
          params: {
            page_name: "profile",
            content_value: "create_qr",
            email: user?.email,
          },
          sessionId: user?.id,
        });
        props.setShowQRBuilderModal(true);
      }}
    />
  );
}

export function useQRBuilder(data?: {
  props?: ResponseQrCode;
  initialStep?: number;
}) {
  const { props, initialStep } = data ?? {};

  const [showQRBuilderModal, setShowQRBuilderModal] = useState(false);

  const QRBuilderModalCallback = useCallback(() => {
    return (
      <QRBuilderModal
        props={props}
        showQRBuilderModal={showQRBuilderModal}
        setShowQRBuilderModal={setShowQRBuilderModal}
        initialStep={initialStep}
      />
    );
  }, [props, showQRBuilderModal, setShowQRBuilderModal, initialStep]);

  const CreateQRButtonCallback = useCallback(() => {
    return <CreateQRButton setShowQRBuilderModal={setShowQRBuilderModal} />;
  }, [setShowQRBuilderModal]);

  return useMemo(
    () => ({
      CreateQRButton: CreateQRButtonCallback,
      QRBuilderModal: QRBuilderModalCallback,
      setShowQRBuilderModal,
    }),
    [CreateQRButtonCallback, QRBuilderModalCallback, setShowQRBuilderModal],
  );
}
