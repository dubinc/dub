import { Button } from "@dub/ui";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { FC, useCallback, useEffect, useState } from "react";

import { BLACK_COLOR, WHITE_COLOR } from "../../constants/customization/colors";
import {
  isBlackHex,
  isValidHex,
  isWhiteHex,
} from "../../helpers/color-validation";
import { IStyleData } from "../../types/customization";
import { ColorPickerInput } from "./color-picker";

interface ColorsSettingsProps {
  styleData: IStyleData;
  onStyleChange: (styleData: IStyleData) => void;
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

  useEffect(() => {
    setForegroundColor(styleData.foregroundColor || BLACK_COLOR);
    setBackgroundColor(styleData.backgroundColor || WHITE_COLOR);
  }, [styleData]);

  const handleForegroundColorChange = useCallback(
    (color: string) => {
      setForegroundColor(color);
      const valid = isValidHex(color);

      if (valid) {
        onStyleChange({
          ...styleData,
          foregroundColor: color,
        });
      }
    },
    [setForegroundColor, onStyleChange, styleData],
  );

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      setBackgroundColor(color);
      const valid = isValidHex(color);

      if (valid) {
        onStyleChange({
          ...styleData,
          backgroundColor: color,
        });
      }
    },
    [setBackgroundColor, onStyleChange, styleData],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full flex-col items-start gap-4 text-sm md:flex-row">
        <div className="flex w-full flex-row items-end gap-2">
          <ColorPickerInput
            label="QR colour"
            value={foregroundColor}
            onChange={handleForegroundColorChange}
            disabled={disabled}
          />
          {!isBlackHex(foregroundColor) && (
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
              value={backgroundColor}
              onChange={handleBackgroundColorChange}
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
    </div>
  );
};
