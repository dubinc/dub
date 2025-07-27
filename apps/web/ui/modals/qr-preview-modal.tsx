"use client";

import { QRCanvas } from "@/ui/qr-builder/qr-canvas";
import {
  TDownloadFormat,
  useQrDownload,
} from "@/ui/qr-code/use-qr-download.ts";
import { X } from "@/ui/shared/icons";
import QRIcon from "@/ui/shared/icons/qr";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Theme } from "@radix-ui/themes";
import QRCodeStyling from "qr-code-styling";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

const FORMAT_OPTIONS = [
  { id: "svg", label: "SVG" },
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPEG" },
];

interface IQRPreviewModalProps {
  showQRPreviewModal: boolean;
  setShowQRPreviewModal: Dispatch<SetStateAction<boolean>>;
  canvasRef: RefObject<HTMLCanvasElement>;
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
}

function QRPreviewModal({
  showQRPreviewModal,
  setShowQRPreviewModal,
  canvasRef,
  qrCode,
  width = 200,
  height = 200,
}: IQRPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<TDownloadFormat>("svg");

  const { downloadQrCode } = useQrDownload(qrCode);

  const handleClose = () => {
    if (!isDownloading) {
      setShowQRPreviewModal(false);
    }
  };

  const handleDownload = async () => {
    if (!qrCode || !canvasRef.current) {
      toast.error("QR code not found");
      return;
    }

    setIsDownloading(true);
    try {
      await downloadQrCode(selectedFormat);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error("Failed to download QR code");
    } finally {
      setIsDownloading(false);
    }
  };

  const FormatSelect = () => (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div
          className={cn(
            "border-border-300 flex h-10 w-[94px] cursor-pointer items-center justify-between gap-3.5 rounded-md border bg-white px-3 text-sm text-neutral-200 transition-colors",
            "focus-within:border-secondary",
          )}
        >
          <span>
            {FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.label}
          </span>
          <Icon
            icon="line-md:chevron-down"
            className="text-xl text-neutral-200 transition-transform duration-300"
          />
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        className="border-border-100 !z-10 flex w-[94px] flex-col items-center justify-start gap-2 rounded-lg border bg-white p-3 shadow-md"
        sideOffset={5}
        align="start"
      >
        {FORMAT_OPTIONS.map((option) => (
          <DropdownMenu.Item
            key={option.id}
            className={cn(
              "hover:bg-secondary-100 flex h-9 w-full cursor-pointer items-center justify-between rounded-md bg-white p-3",
              {
                "bg-secondary-100": selectedFormat === option.id,
              },
            )}
            onClick={() => setSelectedFormat(option.id as TDownloadFormat)}
          >
            <span
              className={cn("text-neutral text-sm", {
                "text-secondary": selectedFormat === option.id,
              })}
            >
              {option.label}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );

  return (
    <Modal
      showModal={showQRPreviewModal}
      setShowModal={setShowQRPreviewModal}
      className="border-border-500 h-fit"
    >
      <Theme>
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-2 px-6 py-4">
            <div className="flex items-center gap-2">
              <QRIcon className="text-primary h-5 w-5" />
              <h3 className="!mt-0 max-w-xs truncate text-lg font-medium">
                QR Code Preview
              </h3>
            </div>
            <button
              disabled={isDownloading}
              type="button"
              onClick={handleClose}
              className="group relative -right-2 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col items-center gap-6">
              <div className="flex justify-center">
                <QRCanvas
                  ref={canvasRef}
                  qrCode={qrCode}
                  width={width}
                  height={height}
                />
              </div>

              <div className="flex w-full items-center gap-2">
                <FormatSelect />
                <Button
                  text="Download QR"
                  variant="primary"
                  onClick={handleDownload}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </Modal>
  );
}

export function useQRPreviewModal(data: {
  canvasRef: RefObject<HTMLCanvasElement>;
  qrCode: QRCodeStyling | null;
  width?: number;
  height?: number;
}) {
  const { canvasRef, qrCode, width, height } = data;
  const [showQRPreviewModal, setShowQRPreviewModal] = useState(false);

  const QRPreviewModalCallback = useCallback(() => {
    return (
      <QRPreviewModal
        canvasRef={canvasRef}
        qrCode={qrCode}
        width={width}
        height={height}
        showQRPreviewModal={showQRPreviewModal}
        setShowQRPreviewModal={setShowQRPreviewModal}
      />
    );
  }, [canvasRef, qrCode, width, height, showQRPreviewModal]);

  return useMemo(
    () => ({
      QRPreviewModal: QRPreviewModalCallback,
      setShowQRPreviewModal,
    }),
    [QRPreviewModalCallback],
  );
}
