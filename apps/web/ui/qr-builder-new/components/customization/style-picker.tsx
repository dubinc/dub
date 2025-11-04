import { cn } from "@dub/utils";
import { StaticImageData } from "next/image";
import { FC } from "react";
import { IStyleOption } from "../../types/customization";
import { StyleButton } from "./style-button";

interface StylePickerProps {
  label: string;
  styleOptions: IStyleOption[];
  value: string; // This should be the ID, not the type
  onSelect: (id: string, icon?: StaticImageData) => void;
  stylePickerWrapperClassName?: string;
  optionsWrapperClassName?: string;
  iconSize?: number;
  styleButtonClassName?: string;
  disabled?: boolean;
  applyBlackFilter?: boolean;
}

export const StylePicker: FC<StylePickerProps> = ({
  label,
  styleOptions,
  value,
  onSelect,
  stylePickerWrapperClassName,
  optionsWrapperClassName,
  iconSize,
  styleButtonClassName,
  disabled = false,
  applyBlackFilter = false,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", stylePickerWrapperClassName)}>
      <label className="text-sm font-medium">{label}</label>
      <div className="dub-scrollbar overflow-x-auto overflow-y-hidden md:max-h-[170px] md:overflow-x-visible md:overflow-y-auto">
        <div
          className={cn("flex flex-nowrap gap-3 md:flex-wrap", optionsWrapperClassName)}
        >
          {styleOptions.map((styleOption) => (
            <StyleButton
              key={styleOption.id}
              icon={styleOption.icon}
              selected={value === styleOption.id}
              onClick={() => {
                if (!disabled) {
                  onSelect(styleOption.id, styleOption.icon);
                }
              }}
              iconSize={iconSize}
              className={cn("shrink-0", styleButtonClassName)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
