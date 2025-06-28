import { ColorPickerInput } from "@/ui/qr-builder/components/color-picker.tsx";
import { BLACK_COLOR } from "@/ui/qr-builder/constants/customization/colors.ts";
import {
  FRAMES,
  preloadAllFrames,
} from "@/ui/qr-builder/constants/customization/frames.ts";
import { isValidHex } from "@/ui/qr-builder/helpers/is-valid-hex.ts";
import { Input } from "@dub/ui";
import { cn } from "@dub/utils/src";
import { FC, useEffect, useState } from "react";
import { StylePicker } from "./style-picker.tsx";

interface IFrameSelectorProps {
  selectedSuggestedFrame: string;
  isQrDisabled: boolean;
  onFrameSelect: (type: string) => void;
  onFrameColorChange: (color: string) => void;
  onFrameTextChange: (text: string) => void;
  isMobile: boolean;
}

export const FrameSelector: FC<IFrameSelectorProps> = ({
  selectedSuggestedFrame,
  isQrDisabled,
  onFrameSelect,
  onFrameColorChange,
  onFrameTextChange,
  isMobile,
}) => {
  useEffect(() => {
    preloadAllFrames();
  }, []);

  const [frameColor, setFrameColor] = useState<string>(BLACK_COLOR);
  const [frameColorValid, setFrameColorValid] = useState<boolean>(true);
  const [frameText, setFrameText] = useState<string>("Scan Me!");

  const handleFrameColorChange = (color: string) => {
    setFrameColor(color);
    const valid = isValidHex(color);
    setFrameColorValid(valid);
    onFrameColorChange(frameColor);
  };

  const handleFrameTextChange = (text: string) => {
    setFrameText(text);
    onFrameTextChange(text);
  };

  return (
    <div
      className={cn("flex max-w-[680px] flex-col gap-4", {
        "border-border-500 rounded-lg border p-3": !isMobile,
      })}
    >
      <StylePicker
        label="Frame around QR code"
        styleOptions={FRAMES}
        selectedStyle={selectedSuggestedFrame}
        onSelect={(type) => {
          if (!isQrDisabled) {
            onFrameSelect(type);
          }
        }}
        optionsWrapperClassName={`gap-2 ${
          isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
        }`}
        styleButtonClassName="[&_img]:h-[60px] [&_img]:w-[60px] p-2"
        minimalFlow
      />
      <Input
        type="text"
        className={cn(
          "border-border-500 focus:border-secondary h-11 w-full max-w-2xl rounded-md border p-3 text-base",
          {
            "border-red-500": false,
          },
        )}
        placeholder={"Frame Text"}
        value={frameText}
        onChange={(e) => handleFrameTextChange(e.target.value)}
        maxLength={16}
      />
      <ColorPickerInput
        label="Frame colour"
        color={frameColor}
        onColorChange={handleFrameColorChange}
        isValid={frameColorValid}
        setIsValid={setFrameColorValid}
        disabled={selectedSuggestedFrame === "none"}
      />
    </div>
  );
};
