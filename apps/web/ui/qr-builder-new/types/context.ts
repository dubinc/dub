import { EQRType } from "./qr-type";

export type TStepState = 1 | 2 | 3 | null;

export type TDestinationData = string | null;

export type TQrType = EQRType | null;

// Import form data types
import {
  TWebsiteQRFormData,
  TWhatsappQRFormData,
  TWifiQRFormData,
  TPdfQRFormData,
  TImageQRFormData,
  TVideoQRFormData,
  TSocialQRFormData,
  TAppLinkQRFormData,
  TFeedbackQRFormData,
} from "../validation/schemas";
import {RefObject} from "react";
import {QRContentStepRef} from "@/ui/qr-builder-new/components/qr-content-step.tsx";
import { IQRCustomizationData } from "./customization";

export type TQRFormData =
  | TWebsiteQRFormData
  | TWhatsappQRFormData
  | TWifiQRFormData
  | TPdfQRFormData
  | TImageQRFormData
  | TVideoQRFormData
  | TSocialQRFormData
  | TAppLinkQRFormData
  | TFeedbackQRFormData;

export interface IQrBuilderContextType {
  // States
  builderStep: TStepState;
  destinationData: TDestinationData;
  selectedQrType: TQrType;
  hoveredQRType: EQRType | null;
  currentQRType: EQRType | null;
  typeSelectionError: string;
  formData: TQRFormData | null;
  currentFormValues: Record<string, any>;

  // Customization states
  customizationData: IQRCustomizationData;
  customizationActiveTab: string;

  // Computed states
  isTypeStep: boolean;
  isContentStep: boolean;
  isCustomizationStep: boolean;

  // Methods
  onSave: () => void;
  handleNextStep: () => void;
  handleChangeStep: (step: number) => void;
  handleSelectQRType: (type: EQRType) => void;
  handleHoverQRType: (type: EQRType | null) => void;
  handleFormSubmit: (data: TQRFormData) => void;
  updateCurrentFormValues: (values: Record<string, any>) => void;

  // Customization methods
  updateCustomizationData: (data: IQRCustomizationData) => void;
  setCustomizationActiveTab: (tab: string) => void;

  // State setters
  setBuilderStep: (state: TStepState) => void;
  setDestinationData: (data: TDestinationData) => void;
  setSelectedQrType: (type: TQrType) => void;

  // Buttons
  handleContinue: () => void;
  handleBack: () => void;

  // Refs
  contentStepRef: RefObject<QRContentStepRef>;
  qrBuilderButtonsWrapperRef:RefObject<HTMLDivElement>
}
