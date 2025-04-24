import {
  EQRType,
  FILE_QR_TYPES,
} from "../../../../(public)/landing/constants/get-qr-config.ts";

export const QR_CONTENT_CONFIG: Record<
  Exclude<EQRType, (typeof FILE_QR_TYPES)[number]>,
  {
    id: string;
    label: string;
    type: string;
    isInputOnFocus?: boolean;
    placeholder?: string;
    maxLength?: number;
  }[]
> = {
  [EQRType.WEBSITE]: [
    {
      id: `${EQRType.WEBSITE}-qr-name`,
      label: "Enter Name of your QR Code",
      type: "text",
      isInputOnFocus: true,
      placeholder: "Name of your QR Code",
    },
    {
      id: `${EQRType.WEBSITE}-website-link`,
      label: "Enter your website",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.APP_LINK]: [
    {
      id: `${EQRType.APP_LINK}-qr-name`,
      label: "Enter Name of your QR Code",
      type: "text",
      isInputOnFocus: true,
      placeholder: "Name of your QR Code",
    },
    {
      id: `${EQRType.APP_LINK}-store-link`,
      label: "Store Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.SOCIAL]: [
    {
      id: `${EQRType.SOCIAL}-qr-name`,
      label: "Enter Name of your QR Code",
      type: "text",
      isInputOnFocus: true,
      placeholder: "Name of your QR Code",
    },
    {
      id: `${EQRType.SOCIAL}-social-link`,
      label: "Enter your Social Media Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.FEEDBACK]: [
    {
      id: `${EQRType.FEEDBACK}-link`,
      label: "Link",
      type: "url",
      isInputOnFocus: true,
      placeholder: "Your QR Code",
    },
    {
      id: `${EQRType.FEEDBACK}-store-link`,
      label: "Store Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.WHATSAPP]: [
    {
      id: `${EQRType.WHATSAPP}-number`,
      label: "Your number",
      type: "tel",
      isInputOnFocus: true,
      placeholder: "Type your number",
    },
    {
      id: `${EQRType.WHATSAPP}-message`,
      label: "Message",
      type: "textarea",
      placeholder: "Type a welcome text...",
      maxLength: 160,
    },
  ],
  [EQRType.WIFI]: [
    {
      id: `${EQRType.WIFI}-network`,
      label: "Network name (SSID)",
      type: "text",
      isInputOnFocus: true,
      placeholder: "Enter network name",
    },
    {
      id: `${EQRType.WIFI}-network-password`,
      label: "Network password",
      type: "password",
      placeholder: "Enter password",
    },
  ],
};

export const ENCRYPTION_TYPES = [
  { id: "wep", label: "WEP" },
  { id: "wpa", label: "WPA" },
  { id: "wpa2-eap", label: "WPA2-EAP" },
  { id: "nopass", label: "nopass" },
];
