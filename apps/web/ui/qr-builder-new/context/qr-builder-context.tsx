"use client";

import { createContext, ReactNode, useContext, useState } from "react";
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

    // Methods
    onSave,

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
