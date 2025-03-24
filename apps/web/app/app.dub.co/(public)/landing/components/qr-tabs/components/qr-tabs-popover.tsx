import { Button, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { FC } from "react";
import { QRType } from "../../../constants/get-qr-config.ts";

interface IQRTabsPopoverProps {
  qrTypes: QRType[];
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  handlePopoverItemClick: (tabId: string) => void;
  isMobile: boolean;
  showButtonContent?: boolean;
  selectedQrType?: QRType;
}

export const QRTabsPopover: FC<IQRTabsPopoverProps> = ({
  qrTypes,
  openPopover,
  setOpenPopover,
  handlePopoverItemClick,
  isMobile,
  showButtonContent = false,
  selectedQrType = qrTypes[0],
}) => {
  const selectedQrTypeIndex = qrTypes.findIndex(
    (qrType) => qrType.id === selectedQrType?.id,
  );

  return (
    <Popover
      align="end"
      content={
        <ScrollArea.Root
          type={isMobile ? "always" : undefined}
          className="w-full px-3 md:p-0"
        >
          <ScrollArea.Viewport className="overflow-y-scroll">
            <div className="flex max-h-[274px] w-[95%] flex-col gap-0.5 text-sm md:w-80 md:max-w-[200px] md:p-3">
              {qrTypes.map((option, idx) => (
                <button
                  key={option.id}
                  onClick={() => handlePopoverItemClick(option.id)}
                  className={cn(
                    "hover:bg-primary-300 hover:text-neutral flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-neutral-600",
                    selectedQrType?.id === option.id &&
                      "bg-primary-300 text-neutral",
                  )}
                >
                  <Icon
                    icon={option.icon}
                    className={cn(
                      "h-5 w-5",
                      idx === 4
                        ? "[&>path]:fill-neutral-200"
                        : "[&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                      selectedQrType?.id === option.id &&
                        (idx === 4
                          ? "[&>path]:fill-primary"
                          : "[&>g]:stroke-primary [&>path]:stroke-primary"),
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            className="!right-4 flex !w-1 flex-col items-center rounded-[3px] !bg-[#000033] !bg-opacity-[5.88%] p-[4px]"
          >
            <ScrollArea.Thumb className="!w-1 rounded-lg !bg-[#000830] !bg-opacity-[27.45%]" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <Button
        variant="ghost"
        className={cn(
          "box-border flex items-center justify-center gap-8",
          "h-12 w-12",
          isMobile && "w-full",
          "border-100 rounded-md border bg-white",
          "bg-primary-300 md:bg-transparent",
          "transition-colors hover:bg-white",
          "[&>div]:w-full",
        )}
        text={
          <div className="flex w-full flex-row items-center justify-between gap-2">
            {showButtonContent && selectedQrType && (
              <div className="text-neutral flex flex-row items-center gap-2">
                <Icon
                  icon={selectedQrType.icon}
                  className={cn(
                    "h-4 w-4",
                    selectedQrType && selectedQrTypeIndex === 4
                      ? "[&>path]:fill-primary"
                      : "[&>g]:stroke-primary [&>path]:stroke-primary",
                  )}
                />
                {selectedQrType.label}
              </div>
            )}
            <Icon
              icon={"line-md:chevron-down"}
              className={cn("text-neutral h-5 w-5 transition-transform", {
                "rotate-180": openPopover,
              })}
            />
          </div>
        }
      />
    </Popover>
  );
};
