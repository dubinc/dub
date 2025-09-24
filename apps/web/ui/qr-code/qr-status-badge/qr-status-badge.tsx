import { QrStorageData } from '@/ui/qr-builder/types/types';
import { QRCardStatus } from './qr-code-card-status';
import { QRCardAnalyticsBadge } from './qr-code-card-analytics-badge';

interface IQRStatusBadge {
  qrCode: QrStorageData;
  featuresAccess?: boolean;
}

export function QRStatusBadge({ qrCode, featuresAccess }: IQRStatusBadge) {
  return qrCode.archived || !featuresAccess ? (
    <QRCardStatus className="lg:hidden" archived >
      {qrCode.archived ? "Paused" : "Deactivated"}
    </QRCardStatus>
  ) : (
    <QRCardAnalyticsBadge className="lg:hidden" qrCode={qrCode} />
  );
}
