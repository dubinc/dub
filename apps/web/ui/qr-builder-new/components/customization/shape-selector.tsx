import { cn } from "@dub/utils";
import {FC, useCallback} from "react";

import {
  CORNER_SQUARE_STYLES,
  CORNER_DOT_STYLES,
} from "../../constants/customization/styles";
import { IShapeData } from "../../types/customization";
import { StylePicker } from "./style-picker";

interface ShapeSelectorProps {
  shapeData: IShapeData;
  onShapeChange: (shapeData: IShapeData) => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export const ShapeSelector: FC<ShapeSelectorProps> = ({
  shapeData,
  onShapeChange,
  disabled = false,
  isMobile = false,
}) => {

  const handleCornerSquareStyleChange = useCallback(
      (styleId: string) => {
        onShapeChange({
          ...shapeData,
          cornerSquareStyle: styleId,
        });
      },
      [shapeData, onShapeChange]
  );

  const handleCornerDotStyleChange = useCallback(
      (styleId: string) => {
        onShapeChange({
          ...shapeData,
          cornerDotStyle: styleId,
        });
      },
      [shapeData, onShapeChange]
  );
  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <div 
        className={cn("flex flex-col gap-4", {
          "border-border-500 rounded-lg border p-3": !isMobile,
        })}
      >
        <StylePicker
          label="Corner Square Style"
          styleOptions={CORNER_SQUARE_STYLES}
          value={shapeData.cornerSquareStyle}
          onSelect={handleCornerSquareStyleChange}
          optionsWrapperClassName="gap-2 md:flex-nowrap"
          iconSize={30}
          styleButtonClassName="[&_img]:h-5 [&_img]:w-5 p-3.5"
          disabled={disabled}
        />
        
        <StylePicker
          label="Corner Dot Style"
          styleOptions={CORNER_DOT_STYLES}
          value={shapeData.cornerDotStyle}
          onSelect={handleCornerDotStyleChange}
          optionsWrapperClassName="gap-2 md:flex-nowrap"
          iconSize={30}
          styleButtonClassName="[&_img]:h-5 [&_img]:w-5 p-3.5"
          disabled={disabled}
        />
      </div>
    </div>
  );
};