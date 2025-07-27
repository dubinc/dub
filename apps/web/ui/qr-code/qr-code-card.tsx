import { useTrialExpiredModal } from "@/lib/hooks/use-trial-expired-modal.tsx";
import { QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { QrCodesListContext } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList } from "@dub/ui";
import { useContext, useRef } from "react";
import { QrCodeDetailsColumn } from "./qr-code-details-column.tsx";
import { QrCodeTitleColumn } from "./qr-code-title-column.tsx";

export function QrCodeCard({ qrCode }: { qrCode: QrStorageData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isTrialOver } = useContext(QrCodesListContext);
  const { setShowTrialExpiredModal, TrialExpiredModalCallback } =
    useTrialExpiredModal();

  const { qrCode: builtQrCodeObject, selectedQRType } =
    useQrCustomization(qrCode);

  const currentQrTypeInfo = QR_TYPES.find(
    (item) => item.id === selectedQRType,
  )!;

  return (
    <>
      <TrialExpiredModalCallback />
      <CardList.Card
        key={qrCode.id}
        innerClassName="h-full flex items-center gap-5 sm:gap-8 text-sm"
      >
        <div className="h-full min-w-0 grow">
          <QrCodeTitleColumn
            qrCode={qrCode}
            canvasRef={canvasRef}
            builtQrCodeObject={builtQrCodeObject}
            currentQrTypeInfo={currentQrTypeInfo}
            isTrialOver={isTrialOver}
            setShowTrialExpiredModal={setShowTrialExpiredModal}
          />
        </div>
        <QrCodeDetailsColumn
          qrCode={qrCode}
          canvasRef={canvasRef}
          builtQrCodeObject={builtQrCodeObject}
          currentQrTypeInfo={currentQrTypeInfo}
          isTrialOver={isTrialOver}
          setShowTrialExpiredModal={setShowTrialExpiredModal}
        />
      </CardList.Card>
    </>
  );
}
