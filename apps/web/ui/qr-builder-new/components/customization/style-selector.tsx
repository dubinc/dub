import { cn } from "@dub/utils";
import {FC, useCallback} from "react";

import { DOT_STYLES } from "../../constants/customization/styles";
import { IStyleData } from "../../types/customization";
import { StylePicker } from "./style-picker";
import { ColorsSettings } from "./colors-settings";

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
      [styleData, onStyleChange]
  );
  return (
    <div
      className={cn("flex max-w-[680px] flex-col gap-4", {
        "border-border-500 rounded-lg border p-3": !isMobile,
      })}
    >
      <StylePicker
        label="QR code style"
        styleOptions={DOT_STYLES}
        value={styleData.dotsStyle}
        onSelect={handleDotsStyleChange}
        stylePickerWrapperClassName={cn("", {
          "border border-border-500 p-3 rounded-lg": isMobile,
        })}
        optionsWrapperClassName="gap-2 md:flex-nowrap"
        styleButtonClassName="[&_img]:h-12 [&_img]:w-12 p-3.5"
        disabled={disabled}
      />
      
      <div
        className={cn("", {
          "border-border-500 rounded-lg border p-3": isMobile,
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