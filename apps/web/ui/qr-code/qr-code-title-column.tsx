"use client";

import { useQRPreviewModal } from "@/ui/modals/qr-preview-modal";
import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas.tsx";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { QRCardDetails } from "@/ui/qr-code/qr-code-card-details.tsx";
import { QRCardTitle } from "@/ui/qr-code/qr-code-card-title.tsx";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type.tsx";
import { Tooltip, useMediaQuery } from "@dub/ui";
import { cn, formatDateTime, timeAgo } from "@dub/utils";
import { Text } from "@radix-ui/themes";
import QRCodeStyling from "qr-code-styling";
import { RefObject, useRef } from "react";
import { QRStatusBadge } from './qr-status-badge/qr-status-badge';

interface QrCodeTitleColumnProps {
  qrCode: QrStorageData;
  canvasRef: RefObject<HTMLCanvasElement>;
  builtQrCodeObject: QRCodeStyling | null;
  currentQrTypeInfo: QRType;
  featuresAccess?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}

export function QrCodeTitleColumn({
  qrCode,
  canvasRef,
  builtQrCodeObject,
  currentQrTypeInfo,
  featuresAccess,
  setShowTrialExpiredModal,
}: QrCodeTitleColumnProps) {
  const { domain, key, createdAt, shortLink, title } = qrCode?.link ?? {};
  const { isMobile, width } = useMediaQuery();

  const containerRef = useRef<HTMLDivElement>(null);
  const { QRPreviewModal, setShowQRPreviewModal } = useQRPreviewModal({
    canvasRef,
    qrCode: builtQrCodeObject,
    width: isMobile ? 300 : 200,
    height: isMobile ? 300 : 200,
  });

  return (
    <>
      <QRPreviewModal />
      <div
        ref={containerRef}
        className="flex h-full min-w-0 flex-row items-start gap-4"
      >
        <div className="flex flex-col gap-2">
          <div
            className="cursor-pointer"
            onClick={() => setShowQRPreviewModal(true)}
          >
            <QRCanvas
              ref={canvasRef}
              qrCode={builtQrCodeObject}
              width={width! < 1024 ? 90 : 64}
              height={width! < 1024 ? 90 : 64}
            />
          </div>
          <QRStatusBadge qrCode={qrCode} featuresAccess={featuresAccess} />
        </div>

        <div className="flex h-full w-full min-w-0 flex-col gap-1.5 lg:flex-row lg:justify-start lg:gap-8 xl:gap-12">
          <QrCardType
            className="flex lg:hidden"
            currentQrTypeInfo={currentQrTypeInfo}
          />

          <div className="flex min-w-0 flex-col justify-center gap-1 whitespace-nowrap lg:w-[120px] lg:shrink-0">
            <Text
              as="span"
              size="2"
              weight="bold"
              className="hidden whitespace-nowrap lg:block"
            >
              QR Name
            </Text>
            <QRCardTitle
              qrCode={qrCode}
              featuresAccess={featuresAccess}
              setShowTrialExpiredModal={setShowTrialExpiredModal}
            />
          </div>

          <div className="order-last flex min-w-0 flex-col justify-center gap-1 lg:order-none lg:flex-1 lg:shrink-0">
            <Text
              as="span"
              size="2"
              weight="bold"
              className="hidden whitespace-nowrap lg:block"
            >
              {currentQrTypeInfo.yourContentColumnTitle}
            </Text>
            <QRCardDetails
              qrCode={qrCode}
              featuresAccess={featuresAccess}
              setShowTrialExpiredModal={setShowTrialExpiredModal}
            />
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col items-start justify-center gap-1",
              "lg:hidden",
              "xl:flex xl:flex-1 xl:shrink-0",
            )}
          >
            <>
              <Text
                as="span"
                size="2"
                weight="bold"
                className="hidden whitespace-nowrap lg:block"
              >
                Created
              </Text>
              <Tooltip content={formatDateTime(createdAt)} delayDuration={150}>
                <span className="text-neutral-500">{timeAgo(createdAt)}</span>
              </Tooltip>
            </>
          </div>
        </div>
      </div>
    </>
  );
}
