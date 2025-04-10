import { Checkbox } from "@dub/ui";
import { Options } from "qr-code-styling";
import { FC } from "react";
import { ColorPickerInput } from "./color-picker.tsx";

export interface IColorsSettingsProps {
  options: Options;
  onBorderColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onTransparentBackgroundToggle: (checked: boolean) => void;
}

export const ColorsSettings: FC<IColorsSettingsProps> = ({
  options,
  onBorderColorChange,
  onBackgroundColorChange,
  onTransparentBackgroundToggle,
}) => {
  return (
    <div className="flex flex-col items-start gap-4 text-sm xl:flex-row xl:items-end">
      <ColorPickerInput
        label="Border colour"
        color={options.cornersSquareOptions?.color ?? "#000000"}
        onColorChange={onBorderColorChange}
        pickerId="borderColorPicker"
      />

      <ColorPickerInput
        label="Background colour"
        color={options.backgroundOptions?.color ?? "#ffffff"}
        onColorChange={onBackgroundColorChange}
        pickerId="backgroundColorPicker"
      />

      <div className="border-border-300 bg-border-400 flex h-11 flex-row items-center gap-3 rounded-md border p-3">
        <Checkbox
          value={options.backgroundOptions?.color}
          id={"transparent-background"}
          checked={options.backgroundOptions?.color === "transparent"}
          onCheckedChange={(checked) =>
            onTransparentBackgroundToggle(!!checked)
          }
          className="data-[state=checked]:bg-secondary border-border-300 h-5 w-5 outline-0 data-[state=checked]:border-none"
        />
        <label className="whitespace-nowrap font-normal">
          Transparent background
        </label>
      </div>
    </div>
  );
};
