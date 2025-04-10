import { cn } from "@dub/utils";
import { StaticImageData } from "next/image";
import { FC } from "react";
import { TStyleOption } from "../constants.ts";
import { StyleButton } from "./style-button.tsx";

interface IStylePickerProps {
  label: string;
  styleOptions: TStyleOption[];
  selectedStyle: string;
  onSelect: (type: string, icon?: StaticImageData) => void;
  stylePickerWrapperClassName?: string;
  optionsWrapperClassName?: string;
  iconSize?: number;
  styleButtonClassName?: string;
}

export const StylePicker: FC<IStylePickerProps> = ({
  label,
  styleOptions,
  selectedStyle,
  onSelect,
  stylePickerWrapperClassName,
  optionsWrapperClassName,
  iconSize,
  styleButtonClassName,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", stylePickerWrapperClassName)}>
      <label className="font-medium">{label}</label>
      <div className={cn("flex flex-wrap gap-3", optionsWrapperClassName)}>
        {styleOptions.map((styleOption) => (
          <StyleButton
            key={styleOption?.id}
            icon={styleOption.icon}
            selected={selectedStyle === styleOption.type}
            onClick={() => {
              onSelect(styleOption.type, styleOption.icon);
            }}
            iconSize={iconSize}
            className={styleButtonClassName}
          />
        ))}
      </div>
    </div>
  );
};
