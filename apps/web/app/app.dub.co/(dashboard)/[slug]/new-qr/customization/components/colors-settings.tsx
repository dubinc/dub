import { Options } from "qr-code-styling";
import { FC, useState } from "react";
import { BLACK_COLOR, TRANSPARENT_COLOR, WHITE_COLOR } from "../constants.ts";
import { isValidHex } from "../utils.ts";
import { BackgroundSettings } from "./background-settings.tsx";
import { ColorPickerInput } from "./color-picker.tsx";

export interface IColorsSettingsProps {
  options: Options;
  onBorderColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onTransparentBackgroundToggle: (checked: boolean) => void;
  isMobile?: boolean;
}

export const ColorsSettings: FC<IColorsSettingsProps> = ({
  options,
  onBorderColorChange,
  onBackgroundColorChange,
  onTransparentBackgroundToggle,
  isMobile,
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

        {isMobile ? (
          <div className="flex flex-row items-end gap-2">
            <BackgroundSettings
              backgroundColor={backgroundColor}
              isTransparent={isTransparent}
              optionsBackgroundColor={options.backgroundOptions?.color}
              onColorChange={handleBackgroundColorChange}
              onTransparentToggle={handleTransparentToggle}
              backgroundColorValid={backgroundColorValid}
              setBackgroundColorValid={setBackgroundColorValid}
              label="Transparent"
            />
          </div>
        ) : (
          <BackgroundSettings
            backgroundColor={backgroundColor}
            isTransparent={isTransparent}
            optionsBackgroundColor={options.backgroundOptions?.color}
            onColorChange={handleBackgroundColorChange}
            onTransparentToggle={handleTransparentToggle}
            backgroundColorValid={backgroundColorValid}
            setBackgroundColorValid={setBackgroundColorValid}
          />
        )}
      </div>

      {showError && (
        <p className="mt-1 text-sm text-red-500">The color is invalid.</p>
      )}
    </div>
  );
};
