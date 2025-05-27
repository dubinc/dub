import { useQRBuilder } from "@/ui/modals/qr-builder";
import { QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { useQrCustomization } from "@/ui/qr-builder/hooks/use-qr-customization.ts";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList, useMediaQuery } from "@dub/ui";
import { useRef } from "react";
import { QrCodeDetailsColumn } from "./qr-code-details-column.tsx";
import { QrCodeTitleColumn } from "./qr-code-title-column.tsx";

export function QrCodeCard({ qrCode }: { qrCode: ResponseQrCode }) {
  const { isMobile } = useMediaQuery();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { setShowQRBuilderModal, QRBuilderModal } = useQRBuilder({
    props: qrCode,
  });

  const { qrCode: builtQrCodeObject, selectedQRType } =
    useQrCustomization(qrCode);

  const currentQrTypeInfo = QR_TYPES.find(
    (item) => item.id === selectedQRType,
  )!;

  return (
    <>
      <QRBuilderModal />
      <CardList.Card
        key={qrCode.id}
        onClick={isMobile ? undefined : () => setShowQRBuilderModal(true)}
        innerClassName="h-full flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
      >
        <div className="h-full min-w-0 grow">
          <QrCodeTitleColumn
            qrCode={qrCode}
            canvasRef={canvasRef}
            builtQrCodeObject={builtQrCodeObject}
            currentQrTypeInfo={currentQrTypeInfo}
          />
        </div>
        <QrCodeDetailsColumn
          qrCode={qrCode}
          canvasRef={canvasRef}
          currentQrTypeInfo={currentQrTypeInfo}
        />
      </CardList.Card>
    </>
  );
}
