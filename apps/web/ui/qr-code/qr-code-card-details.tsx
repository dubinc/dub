import { useQRContentEditor } from "@/ui/modals/qr-content-editor";
import {
  EQRType,
  LINKED_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config.ts";
import { unescapeWiFiValue } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { Tooltip } from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { memo } from "react";

const getDisplayContent = (qrCode: QrStorageData): string => {
  const { data, qrType } = qrCode;

  switch (qrType as EQRType) {
    case EQRType.WHATSAPP:
      try {
        const url = new URL(qrCode.link.url);
        let number = "";

        if (url.hostname === "wa.me") {
          number = url.pathname.replace("/", "");
        } else if (
          url.hostname === "whatsapp.com" ||
          url.hostname === "api.whatsapp.com"
        ) {
          number = url.searchParams.get("phone") || "";
        }

        if (number) {
          // Форматируем номер с кодом страны
          return `+${number.replace(/\D/g, "")}`;
        }
      } catch (e) {
        const numberMatch = data.match(/\d+/);
        if (numberMatch) {
          return `+${numberMatch[0]}`;
        }
      }
      return data;

    case EQRType.WIFI:
      const wifiMatch = data.match(
        /WIFI:T:([^;]+(?:\\;[^;]+)*);S:([^;]+(?:\\;[^;]+)*);P:([^;]+(?:\\;[^;]+)*);H:([^;]+(?:\\;[^;]+)*);/,
      );
      if (wifiMatch) {
        return unescapeWiFiValue(wifiMatch[2]); // networkName
      }
      return data;

    case EQRType.PDF:
    case EQRType.IMAGE:
    case EQRType.VIDEO:
      if (qrCode.file?.name) {
        return qrCode.file.name;
      }

      if (qrCode.link?.url) {
        try {
          const url = new URL(qrCode.link.url);
          const id = url.pathname.split("/").pop();
          return id || qrCode.link.url;
        } catch {
          return qrCode.link.url;
        }
      }

      return data;

    case EQRType.WEBSITE:
    case EQRType.APP_LINK:
    case EQRType.SOCIAL:
    case EQRType.FEEDBACK:
    default:
      return qrCode.link?.url || data;
  }
};

export const QRCardDetails = memo(
  ({
    qrCode,
    compact,
    isTrialOver,
    setShowTrialExpiredModal,
  }: {
    qrCode: QrStorageData;
    compact?: boolean;
    isTrialOver?: boolean;
    setShowTrialExpiredModal?: (show: boolean) => void;
  }) => {
    const displayContent = getDisplayContent(qrCode);
    const qrType = qrCode.qrType as EQRType;

    const { setShowQRContentEditorModal, QRContentEditorModal } =
      useQRContentEditor({
        qrCode: qrCode,
      });

    const onEditClick = (e: React.MouseEvent<SVGSVGElement>) => {
      e.stopPropagation();
      if (isTrialOver) {
        setShowTrialExpiredModal?.(true);
        return;
      }
      setShowQRContentEditorModal(true);
    };

    const isLinkType = LINKED_QR_TYPES.includes(qrType);

    return (
      <>
        <QRContentEditorModal />
        <div
          className={cn(
            "flex min-w-0 items-center whitespace-nowrap text-sm transition-[opacity,display] delay-[0s,150ms] duration-[150ms,0s]",
            compact
              ? [
                  "gap-2.5 opacity-100",
                  "xs:min-w-[40px] xs:basis-[40px] min-w-0 shrink-0 basis-0 sm:min-w-[120px] sm:basis-[120px] md:grow",
                ]
              : "gap-1.5 opacity-100 md:gap-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            {isLinkType && qrCode.link?.url ? (
              <a
                href={qrCode.link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={qrCode.link.url}
                className="min-w-0 truncate font-medium text-neutral-500 transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2"
              >
                {qrType === EQRType.WEBSITE ||
                qrType === EQRType.APP_LINK ||
                qrType === EQRType.SOCIAL ||
                qrType === EQRType.FEEDBACK
                  ? getPrettyUrl(displayContent)
                  : displayContent}
              </a>
            ) : (
              <span
                className="min-w-0 truncate font-medium text-neutral-500"
                title={displayContent}
              >
                {displayContent}
              </span>
            )}

            <Tooltip content="Edit" delayDuration={150}>
              <div className="shrink-0 p-1">
                <Icon
                  icon="uil:edit"
                  className="text-secondary cursor-pointer"
                  onClick={onEditClick}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      </>
    );
  },
);
