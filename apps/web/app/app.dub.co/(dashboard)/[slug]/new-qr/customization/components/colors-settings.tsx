import { Checkbox } from "@dub/ui";
import { Options } from "qr-code-styling";
import { FC, useState } from "react";
import { BLACK_COLOR, TRANSPARENT_COLOR, WHITE_COLOR } from "../constants.ts";
import { isValidHex } from "../utils.ts";
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
  const initialBackground = options.backgroundOptions?.color ?? WHITE_COLOR;
  const isInitiallyTransparent = initialBackground === TRANSPARENT_COLOR;

  const [borderColor, setBorderColor] = useState(
    options.cornersSquareOptions?.color ?? BLACK_COLOR,
  );
  const [backgroundColor, setBackgroundColor] = useState(
    isInitiallyTransparent ? WHITE_COLOR : initialBackground,
  );
  const [borderColorValid, setBorderColorValid] = useState(true);
  const [backgroundColorValid, setBackgroundColorValid] = useState(true);
  const [isTransparent, setIsTransparent] = useState(isInitiallyTransparent);
  const [previousNonTransparentBgColor, setPreviousNonTransparentBgColor] =
    useState(isInitiallyTransparent ? WHITE_COLOR : initialBackground);

  const handleBorderColorChange = (color: string) => {
    setBorderColor(color);
    const valid = isValidHex(color);
    setBorderColorValid(valid);
    onBorderColorChange(color);
  };

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
    const valid = isValidHex(color);
    setBackgroundColorValid(valid);
    if (valid) {
      setPreviousNonTransparentBgColor(color);
    }
    onBackgroundColorChange(color);
  };

  const handleTransparentToggle = (checked: boolean) => {
    setIsTransparent(checked);
    onTransparentBackgroundToggle(checked);

    if (checked) {
      setBackgroundColorValid(true);
    } else {
      setBackgroundColor(previousNonTransparentBgColor);
      setBackgroundColorValid(isValidHex(previousNonTransparentBgColor));
      onBackgroundColorChange(previousNonTransparentBgColor);
    }
  };

  const showError =
    !borderColorValid || (!isTransparent && !backgroundColorValid);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col items-start gap-4 text-sm xl:flex-row xl:items-end">
        <ColorPickerInput
          label="Border colour"
          color={borderColor}
          onColorChange={handleBorderColorChange}
          pickerId="borderColorPicker"
          isValid={borderColorValid}
          setIsValid={setBorderColorValid}
        />

        <ColorPickerInput
          label="Background colour"
          color={backgroundColor}
          onColorChange={handleBackgroundColorChange}
          pickerId="backgroundColorPicker"
          isValid={backgroundColorValid}
          setIsValid={setBackgroundColorValid}
          disabled={isTransparent}
        />

        <div className="border-border-300 bg-border-400 flex h-11 flex-row items-center gap-3 rounded-md border p-3">
          <Checkbox
            value={options.backgroundOptions?.color}
            id="transparent-background"
            checked={isTransparent}
            onCheckedChange={handleTransparentToggle}
            className="data-[state=checked]:bg-secondary border-border-300 h-5 w-5 outline-0 data-[state=checked]:border-none"
          />
          <label className="whitespace-nowrap font-normal">
            Transparent background
          </label>
        </div>
      </div>

      {showError && (
        <p className="mt-1 text-sm text-red-500">The color is invalid.</p>
      )}
    </div>
  );
};
