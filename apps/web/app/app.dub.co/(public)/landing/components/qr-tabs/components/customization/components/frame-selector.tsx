import { FC, useEffect } from "react";
import { StylePicker } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/components/style-picker.tsx";
import {
  FRAMES,
  preloadAllFrames,
} from "../../../../../../../(dashboard)/[slug]/new-qr/customization/constants/frames.ts";

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
      label="Frames"
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
      styleButtonClassName="[&_img]:h-10 [&_img]:w-10 p-2 [&_img]:object-cover"
      minimalFlow
    />
  );
};
