import { QrStorageData } from '@/ui/qr-builder/types/types';
import { QRCardStatus } from './qr-code-card-status';
import { QRCardAnalyticsBadge } from './qr-code-card-analytics-badge';

interface IQRStatusBadge {
  qrCode: QrStorageData;
  featuresAccess?: boolean;
  className?: string;
}

export function QRStatusBadge({ qrCode, featuresAccess, className }: IQRStatusBadge) {
  return qrCode.archived || !featuresAccess ? (
    <QRCardStatus className={className} color={qrCode.archived ? "yellow" : "red"} >
      {qrCode.archived ? "Paused" : "Deactivated"}
    </QRCardStatus>
  ) : (
    <QRCardAnalyticsBadge className={className} qrCode={qrCode} />
  );
}
