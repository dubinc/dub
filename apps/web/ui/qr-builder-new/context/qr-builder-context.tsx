"use client";

import { QRContentStepRef } from "@/ui/qr-builder-new/components/qr-content-step.tsx";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { EQRType } from "../constants/get-qr-config.ts";
import {
  QrBuilderContextType,
  QRFormData,
  QrType,
  TDestinationData,
  TStepState,
} from "../types/context";
import {
  DEFAULT_QR_CUSTOMIZATION,
  QRCustomizationData,
} from "../types/customization";

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
  const [builderStep, setBuilderStep] = useState<TStepState>(1);
  const [destinationData, setDestinationData] =
    useState<TDestinationData>(null);
  const [selectedQrType, setSelectedQrType] = useState<QrType>(null);
  const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
  const [typeSelectionError, setTypeSelectionError] = useState<string>("");
  const [formData, setFormData] = useState<QRFormData | null>(null);
  const [currentFormValues, setCurrentFormValues] = useState<
    Record<string, any>
  >({});

  // Customization states
  const [customizationData, setCustomizationData] =
    useState<QRCustomizationData>(DEFAULT_QR_CUSTOMIZATION);
  const [customizationActiveTab, setCustomizationActiveTab] =
    useState<string>("Frame");

  const contentStepRef = useRef<QRContentStepRef>(null);
  const qrBuilderButtonsWrapperRef = useRef<HTMLDivElement>(null);

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
  const handleNextStep = useCallback(() => {
    // @ts-ignore
    setBuilderStep((prev) => Math.min(prev + 1, 3));
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

  const handleSelectQRType = useCallback(
    (type: EQRType) => {
      setSelectedQrType(type);
      handleNextStep();
    },
    [handleNextStep],
  );

  const handleHoverQRType = useCallback((type: EQRType | null) => {
    setHoveredQRType(type);
  }, []);

  const handleFormSubmit = useCallback(
    (data: QRFormData) => {
      setFormData(data);
      console.log("Form submitted:", data);
      handleNextStep();
    },
    [handleNextStep],
  );

  const handleBack = useCallback(() => {
    const newStep = Math.max((builderStep || 1) - 1, 1);
    handleChangeStep(newStep);
  }, [builderStep, handleChangeStep]);

  const handleContinue = useCallback(async () => {
    if (isContentStep && contentStepRef.current) {
      const isValid = await contentStepRef.current.validateForm();
      if (!isValid) {
        return;
      }
    }
  }, [isContentStep]);

  const updateCurrentFormValues = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);

  // Customization methods
  const updateCustomizationData = useCallback((data: QRCustomizationData) => {
    setCustomizationData(data);
  }, []);

  // Methods
  const onSave = () => {
    // TODO: Implement save logic
    console.log("Save QR code:", {
      builderStep,
      destinationData,
      selectedQrType,
      formData,
      customizationData,
    });
  };
  console.log("NEW BUILDER - Customization Data:", customizationData);
  const contextValue: QrBuilderContextType = {
    // States
    builderStep,
    destinationData,
    selectedQrType,
    hoveredQRType,
    currentQRType,
    typeSelectionError,
    formData,
    currentFormValues,

    // Customization states
    customizationData,
    customizationActiveTab,

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
    handleFormSubmit,
    updateCurrentFormValues,

    // Customization methods
    updateCustomizationData,
    setCustomizationActiveTab,

    // State setters
    setBuilderStep,
    setDestinationData,
    setSelectedQrType,

    //Buttons
    handleBack,
    handleContinue,

    // Refs
    contentStepRef,
    qrBuilderButtonsWrapperRef,
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
