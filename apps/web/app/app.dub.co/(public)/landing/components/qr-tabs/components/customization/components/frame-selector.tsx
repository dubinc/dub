import { FC } from "react";
import { StylePicker } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/components/style-picker.tsx";
import { FRAMES } from "../../../../../../../(dashboard)/[slug]/new-qr/customization/constants/frames.ts";

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
      stylePickerWrapperClassName="border border-border-100 p-3 rounded-lg gap-5"
      optionsWrapperClassName={`gap-2 ${
        isQrDisabled ? "pointer-events-none cursor-not-allowed" : ""
      }`}
      styleButtonClassName="[&_img]:h-8 [&_img]:w-8 p-3.5"
      minimalFlow
    />
  );
};
