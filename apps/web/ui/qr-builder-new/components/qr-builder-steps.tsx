import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { Flex } from "@radix-ui/themes";
import Stepper from "./stepper";

export const QRBuilderSteps = () => {
  const { builderStep, handleChangeStep, isFileUploading, isFileProcessing } =
    useQrBuilderContext();

  // Disable step navigation while files are uploading or processing
  const isDisabled = isFileUploading || isFileProcessing;

  return (
    <Flex align="center" justify="center" className="px-6 py-3">
      <Stepper
        currentStep={builderStep || 1}
        steps={[
          {
            number: 1,
            label: "Choose type",
          },
          { number: 2, label: "Complete Content" },
          { number: 3, label: "Customize QR" },
        ]}
        onStepClick={handleChangeStep}
        disabled={isDisabled}
      />
    </Flex>
  );
};
