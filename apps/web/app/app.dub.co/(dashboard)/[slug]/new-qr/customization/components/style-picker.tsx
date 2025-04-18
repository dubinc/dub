import { cn } from "@dub/utils";
import * as ScrollArea from "@radix-ui/react-scroll-area";
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
  minimalFlow?: boolean;
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
  minimalFlow = false,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", stylePickerWrapperClassName)}>
      {!minimalFlow && <label className="font-medium">{label}</label>}
      <ScrollArea.Root
        type={minimalFlow ? "scroll" : "auto"}
        className="relative w-full overflow-hidden"
      >
        <ScrollArea.Viewport className="overflow-x-auto">
          <div
            className={cn(
              "flex flex-nowrap gap-3 md:flex-wrap",
              optionsWrapperClassName,
            )}
          >
            {styleOptions.map((styleOption) => (
              <StyleButton
                key={styleOption?.id}
                icon={styleOption.icon}
                selected={selectedStyle === styleOption.type}
                onClick={() => {
                  onSelect(styleOption.type, styleOption.icon);
                }}
                iconSize={iconSize}
                className={cn("shrink-0", styleButtonClassName)}
              />
            ))}
          </div>
        </ScrollArea.Viewport>
        <div className="mt-2">
          <ScrollArea.Scrollbar
            orientation="horizontal"
            className="bg-border-100 h-1 rounded-[3px]"
          >
            <ScrollArea.Thumb className="!bg-primary !h-full rounded-lg" />
          </ScrollArea.Scrollbar>
        </div>
      </ScrollArea.Root>
    </div>
  );
};
