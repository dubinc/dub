import { useQRBuilder } from "@/ui/modals/qr-builder";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { CardList, useMediaQuery } from "@dub/ui";
import { QrCodeDetailsColumn } from "./qr-code-details-column.tsx";
import { QrCodeTitleColumn } from "./qr-code-title-column.tsx";

export function QrCodeCard({ qrCode }: { qrCode: ResponseQrCode }) {
  const { isMobile } = useMediaQuery();

  const { setShowQRBuilderModal, QRBuilderModal } = useQRBuilder({
    props: qrCode,
  });

  return (
    <>
      <QRBuilderModal />
      <CardList.Card
        key={qrCode.id}
        onClick={isMobile ? undefined : () => setShowQRBuilderModal(true)}
        innerClassName="flex items-center gap-5 sm:gap-8 md:gap-12 text-sm"
      >
        <div className="min-w-0 grow">
          <QrCodeTitleColumn qrCode={qrCode} />
        </div>
        <QrCodeDetailsColumn qrCode={qrCode} />
      </CardList.Card>
    </>
  );
}
