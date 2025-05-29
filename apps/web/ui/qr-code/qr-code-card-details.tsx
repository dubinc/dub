import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { Tooltip } from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils/src";
import { Icon } from "@iconify/react";
import { memo } from "react";

export const QRCardDetails = memo(
  ({
    link,
    compact,
    hideIcon,
  }: {
    link: ResponseQrCode["link"];
    compact?: boolean;
    hideIcon?: boolean;
  }) => {
    const { url } = link;

    const onEditClick = (e: React.MouseEvent<SVGSVGElement>) => {
      e.stopPropagation();
    };

    return (
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
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="min-w-0 truncate font-medium text-neutral-500 transition-colors hover:text-neutral-700 hover:underline hover:underline-offset-2"
          >
            {getPrettyUrl(url)}
          </a>

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
    );
  },
);
