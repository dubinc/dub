import { CornerDotType, CornerSquareType, Options } from "qr-code-styling";
import { FC } from "react";
import { StylePicker } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/components/style-picker.tsx";
import {
  BORDER_STYLES,
  CENTER_STYLES,
} from "../../../../../../../(dashboard)/[slug]/new-qr/customization/constants.ts";

interface IShapeSelectorProps {
  options: Options;
  onBorderStyleChange: (type: CornerSquareType) => void;
  onCenterStyleChange: (type: CornerDotType) => void;
}

export const ShapeSelector: FC<IShapeSelectorProps> = ({
  options,
  onBorderStyleChange,
  onCenterStyleChange,
}) => {
  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <div className="border-border-100 rounded-lg border p-3">
        <StylePicker
          label="Border Style"
          styleOptions={BORDER_STYLES}
          selectedStyle={options.cornersSquareOptions?.type ?? "square"}
          onSelect={(type) => onBorderStyleChange(type as CornerSquareType)}
          stylePickerWrapperClassName="[&_label]:text-sm"
          optionsWrapperClassName="gap-2 md:flex-nowrap"
          iconSize={30}
          styleButtonClassName="[&_img]:h-5 [&_img]:w-5 p-3.5"
        />
        <StylePicker
          label="Center Style"
          styleOptions={CENTER_STYLES}
          selectedStyle={options.cornersDotOptions?.type ?? "square"}
          onSelect={(type) => onCenterStyleChange(type as CornerDotType)}
          stylePickerWrapperClassName="[&_label]:text-sm"
          optionsWrapperClassName="gap-2 md:flex-nowrap"
          iconSize={30}
          styleButtonClassName="[&_img]:h-5 [&_img]:w-5 p-3.5"
        />
      </div>
    </div>
  );
};
