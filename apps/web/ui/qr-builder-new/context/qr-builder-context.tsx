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
  IQrBuilderContextType,
  TQRFormData,
  TQrType,
  TDestinationData,
  TStepState,
} from "../types/context";
import {
  DEFAULT_QR_CUSTOMIZATION,
  IQRCustomizationData,
} from "../types/customization";
import { TQrServerData, convertServerQRToNewBuilder, TNewQRBuilderData } from "../helpers/data-converters";
import { useNewQrOperations } from "../hooks/use-qr-operations";
import { toast } from "sonner";

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
}

// Provider component
export function QrBuilderProvider({
  children,
  initialQrData,
  isEdit = false,
  homepageDemo = false,
  sessionId,
  onDownload
}: QrBuilderProviderProps) {
  const { createQr, updateQr } = useNewQrOperations();

  const initializeFromProps = useCallback(() => {
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

  const initialState = initializeFromProps();

  const [builderStep, setBuilderStep] = useState<TStepState>(1);
  const [destinationData, setDestinationData] =
    useState<TDestinationData>(null);
  const [selectedQrType, setSelectedQrType] = useState<TQrType>(initialState.selectedQrType);
  const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
  const [typeSelectionError, setTypeSelectionError] = useState<string>("");
  const [formData, setFormData] = useState<TQRFormData | null>(initialState.formData);
  const [currentFormValues, setCurrentFormValues] = useState<
    Record<string, any>
  >({});

  // QR data for editing
  const [originalQrData, setOriginalQrData] = useState<TQrServerData | null>(initialQrData || null);
  const [qrTitle, setQrTitle] = useState<string>(initialState.qrTitle);
  const [fileId, setFileId] = useState<string | undefined>(initialState.fileId);

  // Processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
  const isEditMode = isEdit || !!originalQrData;

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

    setIsProcessing(true);

    try {
      const builderData: TNewQRBuilderData = {
        qrType: selectedQrType,
        formData,
        customizationData,
        title: qrTitle || `${selectedQrType} QR Code`,
        fileId,
      };

      if (isEditMode && originalQrData) {
        await updateQr(originalQrData, builderData);
      } else {
        await createQr(builderData);
      }
    } catch (error) {
      console.error("Error saving QR:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedQrType,
    formData,
    customizationData,
    qrTitle,
    fileId,
    isEditMode,
    originalQrData,
    createQr,
    updateQr,
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
        title: qrTitle || `${selectedQrType} QR Code`,
        fileId,
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
        console.log("Saving form data before moving to customization step:", currentFormValues);
      }
    }

    // Move to next step
    handleNextStep();
  }, [isContentStep, isCustomizationStep, homepageDemo, onDownload, selectedQrType, formData, customizationData, qrTitle, fileId, onSave, handleNextStep, currentFormValues]);

  const updateCurrentFormValues = useCallback((values: Record<string, any>) => {
    setCurrentFormValues(values);
  }, []);

  // Customization methods
  const updateCustomizationData = useCallback((data: IQRCustomizationData) => {
    setCustomizationData(data);
  }, []);

  // QR data methods
  const initializeFromServerData = useCallback((serverData: TQrServerData) => {
    setOriginalQrData(serverData);
    const builderData = convertServerQRToNewBuilder(serverData);

    setQrTitle(builderData.title || "");
    setSelectedQrType(builderData.qrType);
    setFormData(builderData.formData);
    setCustomizationData(builderData.customizationData);
    setFileId(builderData.fileId);
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

    // QR data for editing
    originalQrData,
    qrTitle,
    fileId,

    // Processing states
    isProcessing,

    // Customization states
    customizationData,
    customizationActiveTab,

    // Computed states
    isTypeStep,
    isContentStep,
    isCustomizationStep,
    isEditMode,
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

    // QR data methods
    setQrTitle,
    setFileId,
    initializeFromServerData,

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
export function useQrBuilder(): IQrBuilderContextType {
  const context = useContext(QrBuilderContext);

  if (context === undefined) {
    throw new Error("useQrBuilder must be used within a QrBuilderProvider");
  }

  return context;
}
