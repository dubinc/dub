import { EQRType } from "./qr-type";

export type TStepState = 0 | 1 | 2 | null;

export type TDestinationData = string | null;

export type QrType = EQRType | null;

export interface QrBuilderContextType {
  // States
  builderStep: TStepState;
  destinationData: TDestinationData;
  selectedQrType: QrType;

  // Methods
  onSave: () => void;

  // State setters (for future use)
  setBuilderStep: (state: TStepState) => void;
  setDestinationData: (data: TDestinationData) => void;
  setSelectedQrType: (type: QrType) => void;
}
