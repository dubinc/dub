import { QRBuilderWrapper } from "./components/qr-builder-wrapper.tsx";
import { QrBuilderProvider } from "./context";
import { TNewQRBuilderData, TQrServerData } from "./helpers/data-converters";

interface QRBuilderNewProps {
  homepageDemo?: boolean;
  sessionId?: string;
  onSave?: (data: TNewQRBuilderData) => Promise<void>;
  initialQrData?: TQrServerData | null;
  isEdit?: boolean;
}

export const QRBuilderNew = ({
  homepageDemo = false,
  sessionId,
  onSave,
  initialQrData,
}: QRBuilderNewProps) => {
  return (
    <QrBuilderProvider
      homepageDemo={homepageDemo}
      sessionId={sessionId}
      onSave={onSave}
      initialQrData={initialQrData}
      isEdit={!!initialQrData}
    >
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};
