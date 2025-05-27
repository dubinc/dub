import {
  FRAMES,
  preloadAllFrames,
} from "@/ui/qr-builder/constants/customization/frames.ts";
import { FC, useEffect } from "react";
import { StylePicker } from "./style-picker.tsx";

interface IFrameSelectorProps {
  selectedSuggestedFrame: string;
  isQrDisabled: boolean;
  onFrameSelect: (type: string) => void;
}

export const FrameSelector: FC<IFrameSelectorProps> = ({
  selectedSuggestedFrame,
  isQrDisabled,
  onFrameSelect,
}) => {
  useEffect(() => {
    preloadAllFrames();
  }, []);

  return (
    <StylePicker
      label="Frame around QR code"
      styleOptions={FRAMES}
      selectedStyle={selectedSuggestedFrame}
      onSelect={(type) => {
        if (!isQrDisabled) {
          onFrameSelect(type);
        }
      }}
      stylePickerWrapperClassName="border h-full border-border-500 p-3 rounded-lg gap-5"
      optionsWrapperClassName={`gap-2 ${
        isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
      }`}
      styleButtonClassName="[&_img]:h-12 [&_img]:w-12 p-2"
      minimalFlow
    />
  );
};
