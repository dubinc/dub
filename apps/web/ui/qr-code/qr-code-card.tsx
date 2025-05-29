import { useQRBuilder } from "@/ui/modals/qr-builder";
import { QrCodesListContext, ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList, useMediaQuery } from "@dub/ui";
import { useContext, useRef } from "react";
import { QrCodeDetailsColumn } from "./qr-code-details-column.tsx";
import { QrCodeTitleColumn } from "./qr-code-title-column.tsx";

export function QrCodeCard({ qrCode }: { qrCode: ResponseQrCode }) {
  const { isMobile } = useMediaQuery();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isTrialOver } = useContext(QrCodesListContext);

  const { setShowQRBuilderModal, QRBuilderModal } = useQRBuilder({
    props: qrCode,
  });

  return (
    <>
      <QRBuilderModal />
      <CardList.Card
        key={qrCode.id}
        onClick={isMobile ? undefined : () => setShowQRBuilderModal(true)}
        innerClassName="h-full flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
      >
        <div className="h-full min-w-0 grow">
          <QrCodeTitleColumn qrCode={qrCode} canvasRef={canvasRef} />
        </div>
        <QrCodeDetailsColumn 
          qrCode={qrCode} 
          canvasRef={canvasRef} 
          isTrialOver={isTrialOver} 
        />
      </CardList.Card>
    </>
  );
}
