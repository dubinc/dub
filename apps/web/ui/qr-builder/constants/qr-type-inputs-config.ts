import {
  DEFAULT_WEBSITE,
  DEFAULT_WHATSAPP_MESSAGE,
  DEFAULT_WIFI_NETWORK_NAME,
} from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { getQRNameInput } from "@/ui/qr-builder/helpers/get-qr-name-input-id.ts";
import { EQRType, FILE_QR_TYPES } from "./get-qr-config.ts";

export type TQRInputType =
  | "text"
  | "url"
  | "tel"
  | "password"
  | "textarea"
  | "file";

export enum EAcceptedFileType {
  IMAGE = "image/*",
  PDF = "application/pdf",
  VIDEO = "video/*",
}

export type QRInputConfig = {
  id: string;
  label: string;
  type: TQRInputType;
  placeholder: string;
  tooltip: string;
  initFromPlaceholder?: boolean;
  maxLength?: number;
  acceptedFileType?: EAcceptedFileType;
  maxFileSize?: number;
};

export const QR_NAME_INPUT: QRInputConfig = {
  id: "qrName",
  label: "Name your QR Code",
  type: "text",
  placeholder: "My QR Code",
  tooltip: "Only you can see this. It helps you recognize your QR codes later.",
  initFromPlaceholder: true,
} as const;

export const QR_TYPE_INPUTS_CONFIG: Record<
  Exclude<EQRType, (typeof FILE_QR_TYPES)[number]>,
  QRInputConfig[]
> = {
  [EQRType.WEBSITE]: [
    getQRNameInput(EQRType.WEBSITE),
    {
      id: `websiteLink`,
      label: "Enter your website",
      type: "url",
      placeholder: DEFAULT_WEBSITE,
      tooltip: "This is the link people will open when they scan your QR code.",
    },
  ],
  [EQRType.WHATSAPP]: [
    getQRNameInput(EQRType.WHATSAPP),
    {
      id: `number`,
      label: "WhatsApp Number",
      type: "tel",
      placeholder: "Type your number",
      tooltip:
        "This is the number people will message on WhatsApp after scanning your QR code.",
    },
    {
      id: `message`,
      label: "Pre-typed Message",
      type: "textarea",
      placeholder: DEFAULT_WHATSAPP_MESSAGE,
      maxLength: 160,
      tooltip:
        "This text will appear in the chat box — the user just needs to tap send.",
    },
  ],
  [EQRType.WIFI]: [
    getQRNameInput(EQRType.WIFI),
    {
      id: `networkName`,
      label: "Wifi Network Name",
      type: "text",
      placeholder: DEFAULT_WIFI_NETWORK_NAME,
      tooltip:
        "This is the name of the Wi-Fi network you want to share. You can usually find it on the back of your router.",
    },
    {
      id: `networkPassword`,
      label: "Network password",
      type: "text",
      placeholder: "ExtraToppings123",
      tooltip:
        "People will automatically connect using this password after scanning your QR code.",
      // tooltip:
      //   "People will automatically connect using this password after scanning your QR code. Leave this blank if your network has no password.",
    },
  ],
  [EQRType.IMAGE]: [
    getQRNameInput(EQRType.IMAGE),
    {
      id: "filesImage",
      label: "Image",
      type: "file",
      acceptedFileType: EAcceptedFileType.IMAGE,
      maxFileSize: 5 * 1024 * 1024, // 5 MB
    },
  ],
  [EQRType.PDF]: [
    getQRNameInput(EQRType.PDF),
    {
      id: "filesPDF",
      label: "PDF",
      type: "file",
      acceptedFileType: EAcceptedFileType.PDF,
      maxFileSize: 20 * 1024 * 1024, // 20 MB
    },
  ],
  [EQRType.VIDEO]: [
    getQRNameInput(EQRType.VIDEO),
    {
      id: "filesVideo",
      label: "Video",
      type: "file",
      acceptedFileType: EAcceptedFileType.VIDEO,
      maxFileSize: 50 * 1024 * 1024, // 50 MB
    },
  ],
};
