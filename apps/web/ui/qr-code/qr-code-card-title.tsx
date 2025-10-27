import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { Tooltip } from "@dub/ui";
import { Icon } from "@iconify/react";
import { Flex } from "@radix-ui/themes";
import { FC } from "react";
import { useQRRenameModal } from "../modals/qr-rename-modal";

interface IQRCardTitle {
  qrCode: QrStorageData;
  featuresAccess?: boolean;
  setShowTrialExpiredModal?: (show: boolean) => void;
}

export const QRCardTitle: FC<IQRCardTitle> = ({
  qrCode,
  featuresAccess,
  setShowTrialExpiredModal,
}) => {
  const { QRRenameModal, setShowQRRenameModal } = useQRRenameModal({ qrCode });

  const onEditClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (!featuresAccess) {
      setShowTrialExpiredModal?.(true);
      return;
    }
    setShowQRRenameModal(true);
  };

  const displayValue = qrCode.title || "Untitled QR";

  return (
    <>
      <QRRenameModal />
      <Flex direction="row" gap="1" align="center" className="h-[26px] min-w-0">
        <span className="text-neutral min-w-0 truncate font-bold lg:font-medium lg:text-neutral-500">
          {displayValue}
        </span>
        <Tooltip content="Rename" delayDuration={150}>
          <div className="shrink-0 p-1">
            <Icon
              icon="uil:edit"
              className="text-secondary cursor-pointer"
              onClick={onEditClick}
            />
          </div>
        </Tooltip>
      </Flex>
    </>
  );
};
