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
import { toast } from "sonner";
import { EQRType } from "../constants/get-qr-config.ts";
import {
  convertServerQRToNewBuilder,
  TNewQRBuilderData,
  TQrServerData,
} from "../helpers/data-converters";
import {
  IQrBuilderContextType,
  TDestinationData,
  TQRFormData,
  TQrType,
  TStepState,
} from "../types/context";
import {
  DEFAULT_QR_CUSTOMIZATION,
  IQRCustomizationData,
} from "../types/customization";

// Create context
const QrBuilderContext = createContext<IQrBuilderContextType | undefined>(
  undefined,
);

// Provider props
interface QrBuilderProviderProps {
  children: ReactNode;
  initialQrData?: TQrServerData | null;
  isEdit?: boolean;
  homepageDemo?: boolean;
  sessionId?: string;
  onDownload?: (data: TNewQRBuilderData) => Promise<void>;
  onSave?: (
    builderData: TNewQRBuilderData,
    originalQrData?: TQrServerData | null,
  ) => Promise<any>;
}

// Provider component
export function QrBuilderProvider({
  children,
  initialQrData,
  isEdit = false,
  homepageDemo = false,
  sessionId,
  onDownload,
  onSave: onSaveProp,
}: QrBuilderProviderProps) {
  const getInitializedProps = useCallback(() => {
    if (initialQrData) {
      const builderData = convertServerQRToNewBuilder(initialQrData);
      return {
        qrTitle: builderData.title || "",
        selectedQrType: builderData.qrType,
        formData: builderData.formData,
        customizationData: builderData.customizationData,
        fileId: builderData.fileId,
      };
    }
    return {
      qrTitle: "",
      selectedQrType: null,
      formData: null,
      customizationData: DEFAULT_QR_CUSTOMIZATION,
      fileId: undefined,
    };
  }, [initialQrData]);

  const initialState = getInitializedProps();

  const [builderStep, setBuilderStep] = useState<TStepState>(1);
  const [destinationData, setDestinationData] =
    useState<TDestinationData>(null);
  const [selectedQrType, setSelectedQrType] = useState<TQrType>(
    initialState.selectedQrType,
  );
  const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
  const [typeSelectionError, setTypeSelectionError] = useState<string>("");
  const [formData, setFormData] = useState<TQRFormData | null>(
    initialState.formData,
  );
  const [currentFormValues, setCurrentFormValues] = useState<
    Record<string, any>
  >({});

  // Processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);

  // Customization states
  const [customizationData, setCustomizationData] =
    useState<IQRCustomizationData>(initialState.customizationData);
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
    (data: TQRFormData) => {
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

  // Methods
  const onSave = useCallback(async () => {
    if (!selectedQrType || !formData) {
      toast.error("Please complete all required fields");
      return;
    }

    if (!onSaveProp) {
      console.error("onSave prop not provided to QrBuilderProvider");
      toast.error("Save functionality not configured");
      return;
    }

    setIsProcessing(true);

    try {
      const builderData: TNewQRBuilderData = {
        qrType: selectedQrType,
        formData,
        customizationData,
        title: initialState.qrTitle || `${selectedQrType} QR Code`,
        fileId: (formData as any)?.fileId || initialState.fileId,
      };

      await onSaveProp(builderData, initialQrData);
    } catch (error) {
      console.error("Error saving QR:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedQrType,
    formData,
    customizationData,
    initialState.qrTitle,
    initialState.fileId,
    initialQrData,
    onSaveProp,
  ]);

  const handleContinue = useCallback(async () => {
    if (isCustomizationStep && homepageDemo && onDownload) {
      if (!selectedQrType || !formData) {
        toast.error("Please complete all required fields");
        return;
      }

      const builderData: TNewQRBuilderData = {
        qrType: selectedQrType,
        formData,
        customizationData,
        title: initialState.qrTitle || `${selectedQrType} QR Code`,
        fileId: (formData as any)?.fileId || initialState.fileId,
      };

      await onDownload(builderData);
      return;
    }

    if (isCustomizationStep && !homepageDemo) {
      await onSave();
      return;
    }

    if (isContentStep && contentStepRef.current) {
      const isValid = await contentStepRef.current.validateForm();
      if (!isValid) {
        return;
      }

      // Save the current form values to formData state before moving to next step
      if (currentFormValues && Object.keys(currentFormValues).length > 0) {
        setFormData(currentFormValues as TQRFormData);
        console.log(
          "Saving form data before moving to customization step:",
          currentFormValues,
        );
      }
    }

    // Move to next step
    handleNextStep();
  }, [
    isContentStep,
    isCustomizationStep,
    homepageDemo,
    onDownload,
    selectedQrType,
    formData,
    customizationData,
    onSave,
    handleNextStep,
    currentFormValues,
  ]);

  const updateCurrentFormValues = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);

  // Customization methods
  const updateCustomizationData = useCallback((data: IQRCustomizationData) => {
    setCustomizationData(data);
  }, []);

  const contextValue: IQrBuilderContextType = {
    // States
    builderStep,
    destinationData,
    selectedQrType,
    hoveredQRType,
    currentQRType,
    typeSelectionError,
    formData,
    currentFormValues,
    // Processing states
    isProcessing,
    isFileUploading,
    isFileProcessing,

    // Customization states
    customizationData,
    customizationActiveTab,

    // Computed states
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    isEditMode: isEdit,
    homepageDemo,

    // Methods
    onSave,
    onDownload,
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
    setIsFileUploading,
    setIsFileProcessing,

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
export function useQrBuilderContext(): IQrBuilderContextType {
  const context = useContext(QrBuilderContext);

  if (context === undefined) {
    throw new Error("useQrBuilder must be used within a QrBuilderProvider");
  }

  return context;
}
