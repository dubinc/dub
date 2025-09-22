import { Button } from "@dub/ui";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import {FC, useState, useEffect, useCallback} from "react";

import { 
  BLACK_COLOR, 
  WHITE_COLOR 
} from "../../constants/customization/colors";
import { isValidHex, isWhiteHex } from "../../helpers/color-validation";
import { StyleData } from "../../types/customization";
import { ColorPickerInput } from "./color-picker";

interface ColorsSettingsProps {
  styleData: StyleData;
  onStyleChange: (styleData: StyleData) => void;
  frameSelected: boolean;
  disabled?: boolean;
}

export const ColorsSettings: FC<ColorsSettingsProps> = ({
  styleData,
  onStyleChange,
  frameSelected,
  disabled = false,
}) => {
  const [foregroundColor, setForegroundColor] = useState<string>(
    styleData.foregroundColor || BLACK_COLOR,
  );
  const [backgroundColor, setBackgroundColor] = useState<string>(
    styleData.backgroundColor || WHITE_COLOR,
  );
  const [foregroundColorValid, setForegroundColorValid] = useState(true);
  const [backgroundColorValid, setBackgroundColorValid] = useState(true);

  useEffect(() => {
    setForegroundColor(styleData.foregroundColor || BLACK_COLOR);
    setBackgroundColor(styleData.backgroundColor || WHITE_COLOR);
  }, [styleData]);


  const handleForegroundColorChange = useCallback(
      (color: string) => {
        setForegroundColor(color);
        const valid = isValidHex(color);
        setForegroundColorValid(valid);

        if (valid) {
          onStyleChange({
            ...styleData,
            foregroundColor: color,
          });
        }
      },
      [setForegroundColor, setForegroundColorValid, onStyleChange, styleData]
  );

  const handleBackgroundColorChange = useCallback(
      (color: string) => {
        setBackgroundColor(color);
        const valid = isValidHex(color);
        setBackgroundColorValid(valid);

        if (valid) {
          onStyleChange({
            ...styleData,
            backgroundColor: color,
          });
        }
      },
      [setBackgroundColor, setBackgroundColorValid, onStyleChange, styleData]
  );


  const showError = !foregroundColorValid || (!frameSelected && !backgroundColorValid);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full flex-col items-start gap-4 text-sm md:flex-row">
        <div className="flex w-full flex-row items-end gap-2">
          <ColorPickerInput
            label="QR colour"
            color={foregroundColor}
            onColorChange={handleForegroundColorChange}
            isValid={foregroundColorValid}
            setIsValid={setForegroundColorValid}
            disabled={disabled}
          />
          {foregroundColor !== BLACK_COLOR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="secondary"
                className="border-border-500 h-11 max-w-11 p-3"
                onClick={() => handleForegroundColorChange(BLACK_COLOR)}
                icon={<RotateCcw className="text-neutral h-5 w-5" />}
                disabled={disabled}
              />
            </motion.div>
          )}
        </div>

        {!frameSelected && (
          <div className="flex w-full flex-row items-end gap-2">
            <ColorPickerInput
              label="Background colour"
              color={backgroundColor}
              onColorChange={handleBackgroundColorChange}
              isValid={backgroundColorValid}
              setIsValid={setBackgroundColorValid}
              disabled={disabled}
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
                  onClick={() => handleBackgroundColorChange(WHITE_COLOR)}
                  icon={<RotateCcw className="text-neutral h-5 w-5" />}
                  disabled={disabled}
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