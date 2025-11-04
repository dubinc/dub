"use client";

import { Session } from "@/lib/auth";
import { useQRPreviewModal } from "@/ui/modals/qr-preview-modal";
import { QRType } from "@/ui/qr-builder-new/constants/get-qr-config";
import { TQrStorageData } from "@/ui/qr-builder-new/types/database";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas.tsx";
import { QRCardDetails } from "@/ui/qr-code/qr-code-card-details.tsx";
import { QRCardTitle } from "@/ui/qr-code/qr-code-card-title.tsx";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type.tsx";
import { Tooltip, useMediaQuery, useRouterStuff } from "@dub/ui";
import { cn, formatDateTime, timeAgo } from "@dub/utils";
import { Text } from "@radix-ui/themes";
import { useNewQrContext } from "app/app.dub.co/(dashboard)/[slug]/helpers/new-qr-context";
import { useSearchParams } from "next/navigation";
import QRCodeStyling from "qr-code-styling";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRStatusBadge } from "./qr-status-badge/qr-status-badge";

interface IQrCodeTitleColumnProps {
  user: Session["user"];
  qrCode: TQrStorageData;
  builtQrCodeObject: QRCodeStyling | null;
  currentQrTypeInfo: QRType;
  featuresAccess?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}

export function QrCodeTitleColumn({
  user,
  qrCode,
  builtQrCodeObject,
  currentQrTypeInfo,
  featuresAccess,
  setShowTrialExpiredModal,
}: IQrCodeTitleColumnProps) {
  const { domain, key, createdAt, shortLink, title } = qrCode?.link ?? {};
  const { isMobile, width } = useMediaQuery();
  const [isPreviewCanvasReady, setIsPreviewCanvasReady] =
    useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const { newQrId, setNewQrId } = useNewQrContext();
  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  const handleTitleCanvasReady = useCallback(() => {
    setIsPreviewCanvasReady(true);
  }, []);

  // Create separate QRCodeStyling instance for the small preview canvas
  const { qrCode: previewQrCodeObject } = useQrCustomization(qrCode);

  const containerRef = useRef<HTMLDivElement>(null);
  const { QRPreviewModal, setShowQRPreviewModal, handleOpenNewQr } =
    useQRPreviewModal({
      canvasRef: modalCanvasRef,
      qrCode: builtQrCodeObject,
      qrCodeId: qrCode.id,
      width: isMobile ? 300 : 200,
      height: isMobile ? 300 : 200,
      user,
    });

  useEffect(() => {
    if (searchParams.get("onboarded")) {
      handleOpenNewQr();
      queryParams({
        del: ["onboarded"],
      });
    }
  }, [searchParams.get("onboarded"), handleOpenNewQr, queryParams]);

  useEffect(() => {
    if (qrCode.id === searchParams.get("qrId") && isPreviewCanvasReady) {
      handleOpenNewQr();
      queryParams({
        del: ["qrId"],
      });
    }
  }, [
    qrCode.id,
    searchParams.get("qrId"),
    handleOpenNewQr,
    queryParams,
    isPreviewCanvasReady,
  ]);

  useEffect(() => {
    if (qrCode.id === newQrId && isPreviewCanvasReady) {
      setTimeout(() => {
        handleOpenNewQr();
        setNewQrId?.(null);
      }, 100);
    }
  }, [qrCode.id, newQrId, setNewQrId, handleOpenNewQr, isPreviewCanvasReady]);

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
              ref={previewCanvasRef}
              qrCodeId={qrCode.id}
              qrCode={previewQrCodeObject}
              width={100}
              height={100}
              onCanvasReady={handleTitleCanvasReady}
            />
          </div>
          <QRStatusBadge
            qrCode={qrCode}
            featuresAccess={featuresAccess}
            className="lg:hidden"
          />
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
