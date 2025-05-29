import { cn } from "@dub/utils";
import { Button, Flex, Responsive } from "@radix-ui/themes";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FC } from "react";

interface IQrBuilderButtonsProps {
  step: number;
  onStepChange: (newStep: number) => void;
  onSaveClick: () => void;
  onBackClick: () => void;
  validateFields: () => Promise<boolean>;
  maxStep?: number;
  minStep?: number;
  onContinue?: () => void;
  className?: string;
  size?: Responsive<"3" | "4" | "1" | "2"> | undefined;
  display?: Responsive<"none" | "inline-flex" | "flex"> | undefined;
  isEdit?: boolean;
  isProcessing?: boolean;
}

export const QrBuilderButtons: FC<IQrBuilderButtonsProps> = ({
  step,
  onStepChange,
  onContinue,
  onSaveClick,
  onBackClick,
  validateFields,
  maxStep = 3,
  minStep = 1,
  className,
  size = "4",
  display = "flex",
  isEdit = false,
  isProcessing = false,
}) => {
  const lastStep = step === maxStep;

  const handleBack = () => {
    onStepChange(Math.max(step - 1, minStep));
    onBackClick();
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

  const buttonText = lastStep
    ? isEdit
      ? "Save changes"
      : "Download QR Code"
    : "Continue";

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
        className="flex min-h-10 min-w-0 shrink"
        disabled={step <= minStep || isProcessing}
        onClick={handleBack}
      >
        <Flex gap="2" align="center" justify="center">
          <ChevronLeft /> <span className="hidden md:inline-flex">Back</span>
        </Flex>
      </Button>

      <Button
        type="submit"
        size={size}
        color="blue"
        className="grow basis-3/4"
        onClick={handleContinue}
        disabled={isProcessing}
      >
        <Flex align="center" justify="center" gap="2">
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonText}
        </Flex>
      </Button>
    </Flex>
  );
};
