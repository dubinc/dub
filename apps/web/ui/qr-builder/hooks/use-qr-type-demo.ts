import { useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { QRCodeDemoMap } from "../components/qr-code-demos/qr-code-demo-map";
import { EQRType } from "../constants/get-qr-config";

interface UseQRTypeDemoProps {
  step: number;
  selectedQRType: EQRType | null;
  form: UseFormReturn<any>;
}

export const useQRTypeDemo = ({
  step,
  selectedQRType,
  form,
}: UseQRTypeDemoProps) => {
  const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);

  const typeStep = step === 1;

  const currentQRType = useMemo(() => {
    return typeStep
      ? hoveredQRType !== null
        ? hoveredQRType
        : selectedQRType
      : selectedQRType;
  }, [typeStep, hoveredQRType, selectedQRType]);

  const qrCodeDemo = useMemo(() => {
    return currentQRType ? QRCodeDemoMap[currentQRType] : null;
  }, [currentQRType]);

  const demoProps = useMemo(() => {
    if (!qrCodeDemo || !currentQRType) return {};

    return qrCodeDemo.propsKeys.reduce(
      (acc: Record<string, string | File[] | undefined>, key: string) => {
        acc[key] = form.getValues()[key];
        return acc;
      },
      {},
    );
  }, [qrCodeDemo, form.getValues(), currentQRType]);

  const handleHoverQRType = (type: EQRType | null) => {
    setHoveredQRType(type);
  };

  return {
    hoveredQRType,
    currentQRType,
    qrCodeDemo,
    demoProps,
    handleHoverQRType,
  };
};
