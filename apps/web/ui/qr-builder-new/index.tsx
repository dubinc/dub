import { QRBuilderWrapper } from "./components/qr-builder-wrapper.tsx";
import { EQRType } from "./constants/get-qr-config";
import { QrBuilderProvider } from "./context";
import { TNewQRBuilderData, TQrServerData } from "./helpers/data-converters";

interface QRBuilderNewProps {
  homepageDemo?: boolean;
  sessionId?: string;
  onSave?: (data: TNewQRBuilderData) => Promise<void>;
  initialQrData?: TQrServerData | null;
  isEdit?: boolean;
  typeToScrollTo?: EQRType | null;
  handleResetTypeToScrollTo?: () => void;
}

export const QRBuilderNew = ({
  homepageDemo = false,
  sessionId,
  onSave,
  initialQrData,
  typeToScrollTo,
  handleResetTypeToScrollTo,
}: QRBuilderNewProps) => {
  return (
    <QrBuilderProvider
      homepageDemo={homepageDemo}
      sessionId={sessionId}
      onSave={onSave}
      initialQrData={initialQrData}
      isEdit={!!initialQrData}
      typeToScrollTo={typeToScrollTo}
      handleResetTypeToScrollTo={handleResetTypeToScrollTo}
    >
      <QRBuilderWrapper />
    </QrBuilderProvider>
  );
};
