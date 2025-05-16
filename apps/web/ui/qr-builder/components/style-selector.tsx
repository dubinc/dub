import { DOTS_STYLES } from "@/ui/qr-builder/constants/customization/styles.ts";
import { cn } from "@dub/utils/src";
import { Options } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { FC } from "react";
import { ColorsSettings } from "./colors-settings.tsx";
import { StylePicker } from "./style-picker.tsx";

interface IStyleSelectorProps {
  options: Options;
  isMobile: boolean;
  onDotsStyleChange: (type: DotType) => void;
  onBorderColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
}

export const StyleSelector: FC<IStyleSelectorProps> = ({
  options,
  isMobile,
  onDotsStyleChange,
  onBorderColorChange,
  onBackgroundColorChange,
}) => {
  return (
    <div
      className={cn("flex max-w-[680px] flex-col gap-4", {
        "border-border-500 rounded-lg border p-3": !isMobile,
      })}
    >
      <StylePicker
        label="QR code style"
        styleOptions={DOTS_STYLES}
        selectedStyle={options.dotsOptions?.type ?? "square"}
        onSelect={(type) => onDotsStyleChange(type as DotType)}
        stylePickerWrapperClassName={cn("[&_label]:text-sm", {
          "border border-border-500 p-3 rounded-lg": isMobile,
        })}
        optionsWrapperClassName="gap-2 md:flex-nowrap"
        styleButtonClassName="[&_img]:h-12 [&_img]:w-12 p-3.5"
      />
      <div
        className={cn("[&>div>div:first-child]:!flex-row", {
          "border-border-500 rounded-lg border p-3": isMobile,
        })}
      >
        <ColorsSettings
          options={options}
          onBorderColorChange={onBorderColorChange}
          onBackgroundColorChange={onBackgroundColorChange}
          isMobile={isMobile}
          minimalFlow
        />
      </div>
    </div>
  );
};
