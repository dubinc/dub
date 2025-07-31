import { QRBuilderData } from "../../types/types";
import { EQRType } from "../get-qr-config";

export const DEFAULT_QR_BUILDER_DATA: QRBuilderData = {
  title: "",
  styles: {},
  frameOptions: { id: "none", color: "", textColor: "", text: "" },
  qrType: EQRType.WEBSITE,
};
