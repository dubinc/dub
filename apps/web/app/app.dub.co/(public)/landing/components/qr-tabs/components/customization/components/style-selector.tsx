import { Options } from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { FC } from "react";
import { ColorsSettings } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/components/colors-settings.tsx";
import { StylePicker } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/components/style-picker.tsx";
import { DOTS_STYLES } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/constants/styles.ts";

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
    <div className="flex max-w-[680px] flex-col gap-4">
      <StylePicker
        label="QR code style"
        styleOptions={DOTS_STYLES}
        selectedStyle={options.dotsOptions?.type ?? "square"}
        onSelect={(type) => onDotsStyleChange(type as DotType)}
        stylePickerWrapperClassName="border border-border-500 p-3 rounded-lg [&_label]:text-sm"
        optionsWrapperClassName="gap-2 md:flex-nowrap"
        styleButtonClassName="[&_img]:h-12 [&_img]:w-12 p-3.5"
      />
      <div className="border-border-500 rounded-lg border p-3 [&>div>div:first-child]:!flex-row">
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
