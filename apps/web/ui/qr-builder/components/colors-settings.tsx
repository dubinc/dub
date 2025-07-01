import {
  BLACK_COLOR,
  WHITE_COLOR,
} from "@/ui/qr-builder/constants/customization/colors.ts";
import { isWhiteHex } from "@/ui/qr-builder/helpers/is-white-hex.ts";
import { Button } from "@dub/ui";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Options } from "qr-code-styling";
import { FC, useState } from "react";
import { isValidHex } from "../helpers/is-valid-hex.ts";
import { ColorPickerInput } from "./color-picker.tsx";

export interface IColorsSettingsProps {
  options: Options;
  onBorderColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  selectedSuggestedFrame: string;
}

export const ColorsSettings: FC<IColorsSettingsProps> = ({
  options,
  onBorderColorChange,
  onBackgroundColorChange,
  selectedSuggestedFrame,
}) => {
  const [borderColor, setBorderColor] = useState<string>(
    options.cornersSquareOptions?.color || BLACK_COLOR,
  );
  const [backgroundColor, setBackgroundColor] = useState<string>(
    options.backgroundOptions?.color || WHITE_COLOR,
  );
  const [borderColorValid, setBorderColorValid] = useState(true);
  const [backgroundColorValid, setBackgroundColorValid] = useState(true);

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
    onBackgroundColorChange(color);
  };

  const showError = !borderColorValid || !backgroundColorValid;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full flex-col items-start gap-4 text-sm md:flex-row">
        <div className="flex w-full flex-row items-end gap-2">
          <ColorPickerInput
            label="Border colour"
            color={borderColor}
            onColorChange={handleBorderColorChange}
            isValid={borderColorValid}
            setIsValid={setBorderColorValid}
          />
          {borderColor !== BLACK_COLOR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="secondary"
                className="border-border-500 h-11 max-w-11 p-3"
                onClick={() => handleBorderColorChange(BLACK_COLOR)}
                icon={<RotateCcw className="text-neutral h-5 w-5" />}
              />
            </motion.div>
          )}
        </div>

        {selectedSuggestedFrame === "none" && (
          <div className="flex w-full flex-row items-end gap-2">
            <ColorPickerInput
              label="Background colour"
              color={backgroundColor}
              onColorChange={handleBackgroundColorChange}
              isValid={backgroundColorValid}
              setIsValid={setBackgroundColorValid}
            />
            {!isWhiteHex(backgroundColor) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="secondary"
                  className="border-border-500 h-11 max-w-11 p-3"
                  onClick={() => {
                    handleBackgroundColorChange(WHITE_COLOR);
                  }}
                  icon={<RotateCcw className="text-neutral h-5 w-5" />}
                />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {showError && (
        <p className="mt-1 text-sm text-red-500">The color is invalid.</p>
      )}
    </div>
  );
};
