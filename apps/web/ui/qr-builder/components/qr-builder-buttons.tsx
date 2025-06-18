import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex, Responsive } from "@radix-ui/themes";
import { ChevronLeft } from "lucide-react";
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
  homePageDemo?: boolean;
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
  homePageDemo = false,
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

  const getButtonText = () => {
    if (!lastStep) {
      return "Continue";
    }

    if (isEdit) {
      return "Save changes";
    }

    if (homePageDemo) {
      return "Download QR Code";
    }

    return "Create QR Code";
  };

  const buttonText = getButtonText();

  return (
    <Flex
      justify="between"
      display={display}
      gap="4"
      className={cn("w-full md:w-auto", className)}
    >
      <Button
        size={size}
        variant="secondary"
        color="blue"
        className="flex min-h-10 min-w-0 shrink basis-1/4"
        disabled={step <= minStep || isProcessing}
        onClick={handleBack}
        icon={
          <ChevronLeft
            className={cn("text-secondary", {
              "text-neutral-400": isProcessing,
            })}
          />
        }
        text={<span className="hidden md:inline">Back</span>}
      />

      <Button
        type="submit"
        size={size}
        color="blue"
        className="grow basis-3/4"
        onClick={handleContinue}
        disabled={isProcessing}
        loading={isProcessing}
        text={buttonText}
      />
    </Flex>
  );
};
