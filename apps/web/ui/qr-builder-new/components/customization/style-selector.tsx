import { cn } from "@dub/utils";
import { FC, useCallback } from "react";

import { DOT_STYLES } from "../../constants/customization/styles";
import { IStyleData } from "../../types/customization";
import { ColorsSettings } from "./colors-settings";
import { StylePicker } from "./style-picker";

interface StyleSelectorProps {
  styleData: IStyleData;
  onStyleChange: (styleData: IStyleData) => void;
  frameSelected: boolean; // Hide background color when frame is selected
  disabled?: boolean;
  isMobile?: boolean;
}

export const StyleSelector: FC<StyleSelectorProps> = ({
  styleData,
  onStyleChange,
  frameSelected,
  disabled = false,
  isMobile = false,
}) => {
  const handleDotsStyleChange = useCallback(
    (dotsStyleId: string) => {
      onStyleChange({
        ...styleData,
        dotsStyle: dotsStyleId,
      });
    },
    [styleData, onStyleChange],
  );
  return (
    <div className="flex w-full flex-col gap-4 pb-6">
      <StylePicker
        label="QR code style"
        styleOptions={DOT_STYLES}
        value={styleData.dotsStyle}
        onSelect={handleDotsStyleChange}
        optionsWrapperClassName={`gap-2 md:flex-nowrap ${isMobile ? "pb-2" : "pb-0"}`}
        styleButtonClassName="[&_img]:h-12 [&_img]:w-12 p-3.5"
        disabled={disabled}
      />

      <div
        className={cn("", {
          "rounded-lg p-3": isMobile,
        })}
      >
        <ColorsSettings
          styleData={styleData}
          onStyleChange={onStyleChange}
          frameSelected={frameSelected}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
