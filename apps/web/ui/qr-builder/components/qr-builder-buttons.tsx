import { cn } from "@dub/utils";
import { Button, Flex, Responsive } from "@radix-ui/themes";
import { ChevronLeft } from "lucide-react";
import { FC } from "react";

interface IQrBuilderButtonsProps {
  step: number;
  onStepChange: (newStep: number) => void;
  onSaveClick: () => void;
  validateFields: () => Promise<boolean>;
  maxStep?: number;
  minStep?: number;
  onContinue?: () => void;
  className?: string;
  size?: Responsive<"3" | "4" | "1" | "2"> | undefined;
  display?: Responsive<"none" | "inline-flex" | "flex"> | undefined;
}

export const QrBuilderButtons: FC<IQrBuilderButtonsProps> = ({
  step,
  onStepChange,
  onContinue,
  onSaveClick,
  validateFields,
  maxStep = 3,
  minStep = 1,
  className,
  size = "4",
  display = "flex",
}) => {
  const lastStep = step === maxStep;

  const handleBack = () => {
    onStepChange(Math.max(step - 1, minStep));
  };

  const handleContinue = async () => {
    if (lastStep) {
      onSaveClick();
      return;
    }

    const isValid = await validateFields();

    if (!isValid) return;

    if (onContinue) {
      onContinue();
    } else {
      onStepChange(Math.min(step + 1, maxStep));
    }
  };

  return (
    <Flex
      justify="between"
      display={display}
      gap="4"
      className={cn("w-full md:w-auto", className)}
    >
      <Button
        size={size}
        variant="outline"
        color="blue"
        className="flex min-h-10 self-center"
        disabled={step <= minStep}
        onClick={handleBack}
      >
        <ChevronLeft />
      </Button>

      <Button
        type="submit"
        size={size}
        color="blue"
        className="min-w-60 basis-3/4"
        onClick={handleContinue}
      >
        {lastStep ? "Download QR Code" : "Continue"}
      </Button>
    </Flex>
  );
};
