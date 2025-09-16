import { EQRType } from "./qr-type";

export type TStepState = 1 | 2 | 3 | null;

export type TDestinationData = string | null;

export type QrType = EQRType | null;

// Import form data types
import {
  WebsiteQRFormData,
  WhatsappQRFormData,
  WifiQRFormData,
  PdfQRFormData,
  ImageQRFormData,
  VideoQRFormData,
  SocialQRFormData,
  AppLinkQRFormData,
  FeedbackQRFormData,
} from "../validation/schemas";

export type QRFormData =
  | WebsiteQRFormData
  | WhatsappQRFormData
  | WifiQRFormData
  | PdfQRFormData
  | ImageQRFormData
  | VideoQRFormData
  | SocialQRFormData
  | AppLinkQRFormData
  | FeedbackQRFormData;

export interface QrBuilderContextType {
  // States
  builderStep: TStepState;
  destinationData: TDestinationData;
  selectedQrType: QrType;
  hoveredQRType: EQRType | null;
  currentQRType: EQRType | null;
  typeSelectionError: string;
  formData: QRFormData | null;
  currentFormValues: Record<string, any>;

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
  handleFormSubmit: (data: QRFormData) => void;
  updateCurrentFormValues: (values: Record<string, any>) => void;

  // State setters
  setBuilderStep: (state: TStepState) => void;
  setDestinationData: (data: TDestinationData) => void;
  setSelectedQrType: (type: QrType) => void;
}
