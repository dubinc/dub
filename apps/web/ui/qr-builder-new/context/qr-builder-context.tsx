"use client";

import { createContext, ReactNode, useContext, useState, useCallback, useMemo } from "react";
import { EQRType } from "../constants/get-qr-config.ts";
import {
  QrBuilderContextType,
  QrType,
  TDestinationData,
  TStepState,
} from "../types/context";

// Create context
const QrBuilderContext = createContext<QrBuilderContextType | undefined>(
  undefined,
);

// Provider props
interface QrBuilderProviderProps {
  children: ReactNode;
}

// Provider component
export function QrBuilderProvider({ children }: QrBuilderProviderProps) {
  // States
  const [builderStep, setBuilderStep] = useState<TStepState>(1);
  const [destinationData, setDestinationData] =
    useState<TDestinationData>(null);
  const [selectedQrType, setSelectedQrType] = useState<QrType>(null);
  const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
  const [typeSelectionError, setTypeSelectionError] = useState<string>("");

  // Computed states
  const isTypeStep = builderStep === 1;
  const isContentStep = builderStep === 2;
  const isCustomizationStep = builderStep === 3;

  const currentQRType = useMemo(() => {
    return isTypeStep
      ? hoveredQRType !== null
        ? hoveredQRType
        : selectedQrType
      : selectedQrType;
  }, [isTypeStep, hoveredQRType, selectedQrType]);

  // Step management methods
  const handleNextStep = useCallback(() => { // @ts-ignore
    setBuilderStep((prev ) => Math.min(prev + 1, 3));
  }, []);

  const handleChangeStep = useCallback(
    (newStep: number) => {
      if (newStep === 2 && !selectedQrType) {
        setTypeSelectionError("Please select a QR code type to continue");
        return;
      }

      setTypeSelectionError("");
      setBuilderStep(newStep as TStepState);
    },
    [selectedQrType],
  );

  const handleSelectQRType = useCallback((type: EQRType) => {
    setSelectedQrType(type);
    handleNextStep();
  }, [handleNextStep]);

  const handleHoverQRType = useCallback((type: EQRType | null) => {
    setHoveredQRType(type);
  }, []);

  // Methods
  const onSave = () => {
    // TODO: Implement save logic
    console.log("Save QR code:", {
      builderStep,
      destinationData,
      selectedQrType,
    });
  };

  const contextValue: QrBuilderContextType = {
    // States
    builderStep,
    destinationData,
    selectedQrType,
    hoveredQRType,
    currentQRType,
    typeSelectionError,

    // Computed states
    isTypeStep,
    isContentStep,
    isCustomizationStep,

    // Methods
    onSave,
    handleNextStep,
    handleChangeStep,
    handleSelectQRType,
    handleHoverQRType,

    // State setters
    setBuilderStep,
    setDestinationData,
    setSelectedQrType,
  };

  return (
    <QrBuilderContext.Provider value={contextValue}>
      {children}
    </QrBuilderContext.Provider>
  );
}

// Custom hook to use the context
export function useQrBuilder(): QrBuilderContextType {
  const context = useContext(QrBuilderContext);

  if (context === undefined) {
    throw new Error("useQrBuilder must be used within a QrBuilderProvider");
  }

  return context;
}
