import { Session } from "@/lib/auth/utils";
import { QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { QrCardType } from "@/ui/qr-code/qr-code-card-type.tsx";
import { QrCodeControls } from "@/ui/qr-code/qr-code-controls.tsx";
import QRCodeStyling from "qr-code-styling";
import { RefObject, useRef } from "react";
import { QRStatusBadge } from "./qr-status-badge/qr-status-badge";

interface QrCodeDetailsColumnProps {
  qrCode: QrStorageData;
  canvasRef: RefObject<HTMLCanvasElement>;
  builtQrCodeObject: QRCodeStyling | null;
  currentQrTypeInfo: QRType;
  featuresAccess?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
  user: Session["user"];
}

export function QrCodeDetailsColumn({
  user,
  qrCode,
  canvasRef,
  builtQrCodeObject,
  currentQrTypeInfo,
  featuresAccess,
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
        <QRStatusBadge qrCode={qrCode} featuresAccess={featuresAccess} />
      </div>

      <QrCodeControls
        user={user}
        qrCode={qrCode}
        canvasRef={canvasRef}
        builtQrCodeObject={builtQrCodeObject}
        featuresAccess={featuresAccess}
        setShowTrialExpiredModal={setShowTrialExpiredModal}
      />
    </div>
  );
}
