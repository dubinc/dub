import Stepper from "./stepper";
import { Flex } from "@radix-ui/themes";
import { useQrBuilder } from "@/ui/qr-builder-new/context";

const QR_BUILDER_STEP_TITLES = [
  "Choose QR Code Type",
  "Complete the content",
  "Customize your QR",
];

export const QRBuilderSteps = () => {
  const { builderStep, handleChangeStep } = useQrBuilder();

  return (
    <div>
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
        />
      </Flex>
      
      <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
        <h2 className="text-xl font-semibold text-neutral-900">
          {QR_BUILDER_STEP_TITLES[(builderStep || 1) - 1]}
        </h2>
      </div>
    </div>
  );
};
