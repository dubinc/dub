import { cn } from "@dub/utils";
import * as ScrollArea from "@radix-ui/react-scroll-area";
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
  maxHeight?: string;
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
  maxHeight = "500px",
}) => {
  return (
    <div className={cn("flex flex-col gap-2", stylePickerWrapperClassName)}>
      <label className="text-sm font-medium">{label}</label>
      <ScrollArea.Root type="auto" className="relative w-full overflow-hidden">
        <ScrollArea.Viewport
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          <div
            className={cn("flex flex-wrap gap-3", optionsWrapperClassName)}
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
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="bg-border-100 w-1.5 cursor-pointer rounded-[3px]"
        >
          <ScrollArea.Thumb className="!bg-primary rounded-lg" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};
