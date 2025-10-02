import { QRBuilderWrapper } from "./components/qr-builder-wrapper.tsx";
import { QrBuilderProvider } from "./context";
import { TNewQRBuilderData, TQrServerData } from "./helpers/data-converters";

interface QRBuilderNewProps {
  homepageDemo?: boolean;
  sessionId?: string;
  onDownload?: (data: TNewQRBuilderData) => Promise<void>;
  onSave?: (
    data: TNewQRBuilderData,
    initialData?: TQrServerData | null,
  ) => Promise<void>;
  initialQrData?: TQrServerData | null;
  isEdit?: boolean;
}

export const QRBuilderNew = ({
  homepageDemo,
  sessionId,
  onDownload,
  onSave,
  initialQrData,
  isEdit,
}: QRBuilderNewProps) => {
  return (
    <QrBuilderProvider
      homepageDemo={homepageDemo}
      sessionId={sessionId}
      onDownload={onDownload}
      onSave={onSave}
      initialQrData={initialQrData}
      isEdit={isEdit}
    >
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};
