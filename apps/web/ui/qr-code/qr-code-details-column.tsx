import { QrStorageData } from "@/lib/qr-types.ts";
import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QRCardAnalyticsBadge } from "@/ui/qr-code/qr-code-card-analytics-badge.tsx";
import { QRCardStatus } from "@/ui/qr-code/qr-code-card-status.tsx";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type.tsx";
import { QrCodeControls } from "@/ui/qr-code/qr-code-controls.tsx";
import { RefObject, useRef } from "react";

interface QrCodeDetailsColumnProps {
  qrCode: QrStorageData;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentQrTypeInfo: QRType;
  isTrialOver?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}

export function QrCodeDetailsColumn({
  qrCode,
  canvasRef,
  currentQrTypeInfo,
  isTrialOver,
  setShowTrialExpiredModal,
}: QrCodeDetailsColumnProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex h-full flex-col items-start justify-start gap-6 lg:flex-row lg:items-center lg:justify-end"
    >
      <div className="hidden gap-3 lg:flex lg:gap-6">
        <QrCardType currentQrTypeInfo={currentQrTypeInfo} />
        {qrCode.archived || isTrialOver ? (
          <QRCardStatus archived />
        ) : (
          <QRCardAnalyticsBadge qrCode={qrCode} />
        )}
      </div>

      <QrCodeControls
        qrCode={qrCode}
        canvasRef={canvasRef}
        isTrialOver={isTrialOver}
        setShowTrialExpiredModal={setShowTrialExpiredModal}
      />
    </div>
  );
}
