import { EQRType } from "./qr-type";

export type TStepState = 1 | 2 | 3 | null;

export type TDestinationData = string | null;

export type QrType = EQRType | null;

export interface QrBuilderContextType {
  // States
  builderStep: TStepState;
  destinationData: TDestinationData;
  selectedQrType: QrType;
  hoveredQRType: EQRType | null;
  currentQRType: EQRType | null;
  typeSelectionError: string;

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

  // State setters
  setBuilderStep: (state: TStepState) => void;
  setDestinationData: (data: TDestinationData) => void;
  setSelectedQrType: (type: QrType) => void;
}
