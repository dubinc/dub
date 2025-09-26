import { useQrBuilder } from "@/ui/qr-builder-new/context";
import { Flex, Heading } from "@radix-ui/themes";
import Stepper from "./stepper";


export const QRBuilderSteps = () => {
  const { builderStep, handleChangeStep } = useQrBuilder();

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
        />
      </Flex>
  );
};
