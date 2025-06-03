import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QRCardAnalyticsBadge } from "@/ui/qr-code/qr-code-card-analytics-badge.tsx";
import { QRCardStatus } from "@/ui/qr-code/qr-code-card-status.tsx";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type.tsx";
import { QrCodeControls } from "@/ui/qr-code/qr-code-controls.tsx";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { RefObject, useRef } from "react";

interface QrCodeDetailsColumnProps {
  qrCode: ResponseQrCode;
  canvasRef: RefObject<HTMLCanvasElement>;
  currentQrTypeInfo: QRType;
  isTrialOver?: boolean;
}

export function QrCodeDetailsColumn({
  qrCode,
  canvasRef,
  isTrialOver = false,
  currentQrTypeInfo,
}: QrCodeDetailsColumnProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex h-full flex-col items-start justify-start gap-6 lg:flex-row lg:items-center lg:justify-end"
    >
      <div className="hidden gap-3 lg:flex lg:gap-6">
        <QrCardType currentQrTypeInfo={currentQrTypeInfo} />
        {qrCode.link.archived || isTrialOver ? (
          <QRCardStatus archived />
        ) : (
          <QRCardAnalyticsBadge qrCode={qrCode} />
        )}
      </div>

      <QrCodeControls qrCode={qrCode} canvasRef={canvasRef} />
    </div>
  );
}
