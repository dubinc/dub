import { useCallback, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { EQRType } from "../constants/get-qr-config.ts";

interface UseQRBuilderStepsProps {
  selectedQRType: EQRType | null;
  form: UseFormReturn<any>;
  handleValidationAndContentSubmit: () => Promise<boolean>;
  isProcessing?: boolean;
  initialStep?: number;
}

export const useQRBuilderSteps = ({
  selectedQRType,
  form,
  handleValidationAndContentSubmit,
  isProcessing,
  initialStep,
}: UseQRBuilderStepsProps) => {
  const [step, setStep] = useState<number>(() => {
    if (isProcessing) return 3;
    return initialStep || 1;
  });

  const [typeSelectionError, setTypeSelectionError] = useState<string>("");

  const isTypeStep = step === 1;
  const isContentStep = step === 2;
  const isCustomizationStep = step === 3;

  const handleNextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 3));
  }, []);

  const handleChangeStep = useCallback(
    (newStep: number) => {
      if (newStep === 2 && !selectedQRType) {
        setTypeSelectionError("Please select a QR code type to continue");
        return;
      }

      setTypeSelectionError("");

      if (newStep === 3 && step === 2) {
        form.trigger().then((isValid) => {
          if (isValid) {
            handleValidationAndContentSubmit();
            setStep(newStep);
          }
        });
        return;
      }

      if (newStep === 2) {
        form.trigger();
      }

      setStep(newStep);
    },
    [selectedQRType, handleValidationAndContentSubmit, form, step],
  );

  return {
    step,
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    typeSelectionError,
    handleNextStep,
    handleChangeStep,
  };
};
