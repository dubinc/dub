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
import { TQrServerData } from "../helpers/data-converters";

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

  // QR data for editing
  originalQrData: TQrServerData | null;
  qrTitle: string;
  fileId?: string;

  // Processing states
  isProcessing: boolean;

  // Customization states
  customizationData: IQRCustomizationData;
  customizationActiveTab: string;

  // Computed states
  isTypeStep: boolean;
  isContentStep: boolean;
  isCustomizationStep: boolean;
  isEditMode: boolean;
  homepageDemo?: boolean;

  // Methods
  onSave: () => Promise<void>;
  onDownload?: (data: any) => Promise<void>;
  handleNextStep: () => void;
  handleChangeStep: (step: number) => void;
  handleSelectQRType: (type: EQRType) => void;
  handleHoverQRType: (type: EQRType | null) => void;
  handleFormSubmit: (data: TQRFormData) => void;
  updateCurrentFormValues: (values: Record<string, any>) => void;

  // QR data methods
  setQrTitle: (title: string) => void;
  setFileId: (fileId: string | undefined) => void;
  initializeFromServerData: (serverData: TQrServerData) => void;

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
