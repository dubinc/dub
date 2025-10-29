import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { LayoutGridIcon, FileTextIcon, PaletteIcon } from "lucide-react";
import { useMediaQuery } from "@dub/ui";
import Stepper from "./stepper";

export const QRBuilderSteps = () => {
  const { builderStep, handleChangeStep, isFileUploading, isFileProcessing } =
    useQrBuilderContext();

  const { isMobile } = useMediaQuery();

  // Disable step navigation while files are uploading or processing
  const isDisabled = isFileUploading || isFileProcessing;

  return (
    <Stepper
      currentStep={builderStep || 1}
      steps={[
        {
          number: 1,
          label: isMobile ? "Step 1" : "Choose type",
          icon: LayoutGridIcon,
        },
        {
          number: 2,
          label: isMobile ? "Step 2" : "Complete Content",
          icon: FileTextIcon,
        },
        {
          number: 3,
          label: isMobile ? "Step 3" : "Customize QR",
          icon: PaletteIcon,
        },
      ]}
      onStepClick={handleChangeStep}
      disabled={isDisabled}
    />
  );
};
