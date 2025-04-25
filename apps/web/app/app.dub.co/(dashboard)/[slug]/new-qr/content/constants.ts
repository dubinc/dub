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
    placeholder?: string;
    maxLength?: number;
  }[]
> = {
  [EQRType.WEBSITE]: [
    {
      id: `qrName`,
      label: "Enter Name of your QR Code",
      type: "text",
      placeholder: "Name of your QR Code",
      isNotRequired: true,
    },
    {
      id: `websiteLink`,
      label: "Enter your website",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.APP_LINK]: [
    {
      id: `qrName`,
      label: "Enter Name of your QR Code",
      type: "text",
      placeholder: "Name of your QR Code",
      isNotRequired: true,
    },
    {
      id: `storeLink`,
      label: "Store Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.SOCIAL]: [
    {
      id: `qrName`,
      label: "Enter Name of your QR Code",
      type: "text",
      placeholder: "Name of your QR Code",
      isNotRequired: true,
    },
    {
      id: `socialLink`,
      label: "Enter your Social Media Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.FEEDBACK]: [
    {
      id: `link`,
      label: "Link",
      type: "url",
      placeholder: "https://www.getqr.com/",
    },
  ],
  [EQRType.WHATSAPP]: [
    {
      id: `number`,
      label: "Your number",
      type: "tel",
      placeholder: "Type your number",
    },
    {
      id: `message`,
      label: "Message",
      type: "textarea",
      placeholder: "Type a welcome text...",
      maxLength: 160,
    },
  ],
  [EQRType.WIFI]: [
    {
      id: `networkName`,
      label: "Network name (SSID)",
      type: "text",
      placeholder: "Enter network name",
    },
    {
      id: `networkPassword`,
      label: "Network password",
      type: "text",
      placeholder: "Enter password",
    },
  ],
};

// export const ENCRYPTION_TYPES = [
//   { id: "wep", label: "WEP" },
//   { id: "wpa", label: "WPA" },
//   { id: "wpa2-eap", label: "WPA2-EAP" },
//   { id: "nopass", label: "none" },
// ];
export const ENCRYPTION_TYPES = [
  { id: "WEP", label: "WEP" },
  { id: "WPA", label: "WPA/WPA2" },
  { id: "none", label: "none" },
];

export const DEFAULT_ENCRYPTION = "WEP";
