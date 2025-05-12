import { EQRType, FILE_QR_TYPES } from "./get-qr-config.ts";

export const QR_TYPE_INPUTS_CONFIG: Record<
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
      label: "Name your QR Code",
      type: "text",
      placeholder: "My QR Code",
      tooltip:
        "Only you can see this. It helps you recognize your QR codes later.",
      initFromPlaceholder: true,
    },
    {
      id: `websiteLink`,
      label: "Enter your website",
      type: "url",
      placeholder: "https://www.getqr.com/",
      tooltip: "This is the link people will open when they scan your QR code.",
    },
  ],
  // [EQRType.APP_LINK]: [
  //   {
  //     id: `qrName`,
  //     label: "Enter Name of your QR Code",
  //     type: "text",
  //     placeholder: "Name of your QR Code",
  //     isNotRequired: true,
  //   },
  //   {
  //     id: `storeLink`,
  //     label: "Store Link",
  //     type: "url",
  //     placeholder: "https://www.getqr.com/",
  //   },
  // ],
  // [EQRType.SOCIAL]: [
  //   {
  //     id: `qrName`,
  //     label: "Enter Name of your QR Code",
  //     type: "text",
  //     placeholder: "Name of your QR Code",
  //     isNotRequired: true,
  //   },
  //   {
  //     id: `socialLink`,
  //     label: "Enter your Social Media Link",
  //     type: "url",
  //     placeholder: "https://www.getqr.com/",
  //   },
  // ],
  // [EQRType.FEEDBACK]: [
  //   {
  //     id: `link`,
  //     label: "Link",
  //     type: "url",
  //     placeholder: "https://www.getqr.com/",
  //   },
  // ],
  [EQRType.WHATSAPP]: [
    {
      id: `qrName`,
      label: "Name your QR Code",
      type: "text",
      placeholder: "My QR Code",
      initFromPlaceholder: true,
    },
    {
      id: `number`,
      label: "Your number",
      type: "tel",
      placeholder: "Type your number",
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
