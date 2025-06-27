import {
  BLACK_COLOR,
  TRANSPARENT_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { AnimatePresence } from "framer-motion";
import { Options } from "qr-code-styling";
import { FC, useState } from "react";
import { isValidHex } from "../helpers/is-valid-hex.ts";
import { BackgroundSettings } from "./background-settings.tsx";
import { ColorPickerInput } from "./color-picker.tsx";

export interface IColorsSettingsProps {
  options: Options;
  onBorderColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onTransparentBackgroundToggle?: (checked: boolean) => void;
  isMobile?: boolean;
  selectedSuggestedFrame: string;
}

export const ColorsSettings: FC<IColorsSettingsProps> = ({
  options,
  onBorderColorChange,
  onBackgroundColorChange,
  onTransparentBackgroundToggle,
  isMobile,
  selectedSuggestedFrame,
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
    onTransparentBackgroundToggle?.(checked);

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
      <ScrollArea.Root type="auto" className="relative w-full overflow-hidden">
        <ScrollArea.Viewport className="overflow-x-auto">
          <div className="flex w-full flex-row items-end gap-4 text-sm">
            <ColorPickerInput
              label="Border colour"
              color={borderColor}
              onColorChange={handleBorderColorChange}
              isValid={borderColorValid}
              setIsValid={setBorderColorValid}
            />

            <AnimatePresence>
              {selectedSuggestedFrame === "none" && (
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
            </AnimatePresence>
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

      {showError && (
        <p className="mt-1 text-sm text-red-500">The color is invalid.</p>
      )}
    </div>
  );
};
