import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { LayoutGridIcon, FileTextIcon, PaletteIcon } from "lucide-react";
import Stepper from "./stepper";

export const QRBuilderSteps = () => {
  const { builderStep, handleChangeStep, isFileUploading, isFileProcessing } =
    useQrBuilderContext();

  // Disable step navigation while files are uploading or processing
  const isDisabled = isFileUploading || isFileProcessing;

  return (
    <Stepper
      currentStep={builderStep || 1}
      steps={[
        {
          number: 1,
          label: "Choose type",
          icon: LayoutGridIcon,
        },
        {
          number: 2,
          label: "Complete Content",
          icon: FileTextIcon,
        },
        {
          number: 3,
          label: "Customize QR",
          icon: PaletteIcon,
        },
      ]}
      onStepClick={handleChangeStep}
      disabled={isDisabled}
    />
  );
};
