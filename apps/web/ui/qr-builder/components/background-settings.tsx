import { Checkbox } from "@dub/ui";
import { motion } from "framer-motion";
import { FC } from "react";
import { ColorPickerInput } from "./color-picker.tsx";

interface IBackgroundSettingsProps {
  backgroundColor: string;
  isTransparent: boolean;
  optionsBackgroundColor?: string;
  onColorChange: (color: string) => void;
  onTransparentToggle: (checked: boolean) => void;
  backgroundColorValid: boolean;
  setBackgroundColorValid: (isValid: boolean) => void;
}

export const BackgroundSettings: FC<IBackgroundSettingsProps> = ({
  backgroundColor,
  isTransparent,
  optionsBackgroundColor,
  onColorChange,
  onTransparentToggle,
  backgroundColorValid,
  setBackgroundColorValid,
}) => {
  return (
    <motion.div
      className="flex w-full flex-row items-end gap-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ColorPickerInput
        label="Background colour"
        color={backgroundColor}
        onColorChange={onColorChange}
        isValid={backgroundColorValid}
        setIsValid={setBackgroundColorValid}
        disabled={isTransparent}
      />

      <div className="border-border-300 bg-border-400 flex h-11 flex-row items-center gap-3 rounded-md border p-3">
        <Checkbox
          value={optionsBackgroundColor}
          id="transparent-background"
          checked={isTransparent}
          onCheckedChange={onTransparentToggle}
          className="data-[state=checked]:bg-secondary border-border-300 h-5 w-5 outline-0 data-[state=checked]:border-none"
        />
        <label className="whitespace-nowrap font-normal">
          Transparent background
        </label>
      </div>
    </motion.div>
  );
};
