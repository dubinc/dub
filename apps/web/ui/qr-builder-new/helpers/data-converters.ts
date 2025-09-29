import { NewQrProps } from "@/lib/types";
import { Options } from "qr-code-styling";
import { EQRType } from "../constants/get-qr-config";
import { IQRCustomizationData, IFrameData } from "../types/customization";
import { TQRFormData } from "../types/context";

// New builder types for localStorage/Redis storage 
export type TQRBuilderDataForStorage = {
  title: string;
  styles: Options;
  frameOptions: {
    id: string;
    color: string;
    textColor: string;
    text: string;
  };
  qrType: EQRType;
  fileId?: string;
};

// Type representing all collected data from the new QR builder
export type TNewQRBuilderData = {
  qrType: EQRType;
  formData: TQRFormData;
  customizationData: IQRCustomizationData;
  title?: string;
  fileId?: string;
}

// Type for QR data stored on server (to be converted back to client)
export type TQrServerData = {
  id: string;
  title: string;
  qrType: EQRType;
  data: string;
  styles: Options;
  frameOptions: {
    id: string;
    color?: string;
    textColor?: string;
    text?: string;
  };
  fileId?: string;
  link?: {
    url: string;
    domain: string;
    tagId?: string | null;
    webhookIds?: string[];
  };
}


function convertFormDataToQRData(qrType: EQRType, formData: TQRFormData): string {
  switch (qrType) {
    case EQRType.WEBSITE:
    case EQRType.SOCIAL:
    case EQRType.APP_LINK:
    case EQRType.FEEDBACK:
      return (formData as any).websiteLink || "";

    case EQRType.WHATSAPP:
      const whatsappData = formData as any;
      const phoneNumber = whatsappData.phoneNumber?.replace(/\D/g, "") || "";
      const message = whatsappData.message || "";
      return `https://wa.me/${phoneNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

    case EQRType.WIFI:
      const wifiData = formData as any;
      const security = wifiData.security || "WPA";
      const networkName = wifiData.networkName || "";
      const password = wifiData.password || "";
      const hidden = wifiData.hidden ? "true" : "false";
      return `WIFI:T:${security};S:${networkName};P:${password};H:${hidden};;`;

    case EQRType.PDF:
    case EQRType.IMAGE:
    case EQRType.VIDEO:
      // For file types, the actual URL will be set by the server after file upload
      return "";

    default:
      return "";
  }
}

// Helper functions for server conversion
function generateDefaultTitle(qrType: EQRType): string {
  return `${qrType.charAt(0).toUpperCase() + qrType.slice(1)} QR Code`;
}

function buildQRStylingOptions(customizationData: IQRCustomizationData, qrData: string): Options {
  const { style, shape, logo } = customizationData;

  const stylingOptions: Options = {
    data: qrData,
    width: 300,
    height: 300,
    type: "svg",
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 10,
      crossOrigin: "anonymous"
    },
    dotsOptions: {
      color: style.foregroundColor || "#000000",
      type: mapDotsStyleToQRCodeStyling(style.dotsStyle)
    },
    backgroundOptions: {
      color: style.backgroundColor || "#ffffff"
    },
    cornersSquareOptions: {
      color: style.foregroundColor || "#000000",
      type: mapCornerSquareStyleToQRCodeStyling(shape.cornerSquareStyle)
    },
    cornersDotOptions: {
      color: style.foregroundColor || "#000000",
      type: mapCornerDotStyleToQRCodeStyling(shape.cornerDotStyle)
    }
  };

  // Handle logo
  if (logo.type === "uploaded" && logo.file) {
    stylingOptions.image = URL.createObjectURL(logo.file);
  } else if (logo.type === "suggested" && logo.id && logo.id !== "logo-none") {
    stylingOptions.image = `/logos/${logo.id}.png`;
  }

  return stylingOptions;
}

function buildFrameOptions(frameData: IFrameData): any {
  return {
    id: frameData.id === "frame-none" ? "none" : frameData.id,
    color: frameData.color || "#000000",
    textColor: frameData.textColor || "#ffffff",
    text: frameData.text || "Scan Me"
  };
}

// Helper functions for client conversion
function extractFormDataFromServer(qrType: EQRType, data: string, linkUrl?: string): TQRFormData {
  const sourceData = linkUrl || data;

  switch (qrType) {
    case EQRType.WEBSITE:
    case EQRType.SOCIAL:
    case EQRType.APP_LINK:
    case EQRType.FEEDBACK:
      return {
        qrName: "",
        websiteLink: sourceData
      } as any;

    case EQRType.WHATSAPP:
      const whatsappMatch = sourceData.match(/https:\/\/wa\.me\/(\d+)(?:\?text=(.*))?/);
      return {
        qrName: "",
        phoneNumber: whatsappMatch?.[1] || "",
        message: whatsappMatch?.[2] ? decodeURIComponent(whatsappMatch[2]) : ""
      } as any;

    case EQRType.WIFI:
      const wifiMatch = sourceData.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);/);
      return {
        qrName: "",
        security: wifiMatch?.[1] || "WPA",
        networkName: wifiMatch?.[2] || "",
        password: wifiMatch?.[3] || "",
        hidden: wifiMatch?.[4] === "true"
      } as any;

    case EQRType.PDF:
    case EQRType.IMAGE:
    case EQRType.VIDEO:
      return {
        qrName: "",
        file: null
      } as any;

    default:
      return {
        qrName: ""
      } as any;
  }
}

function extractCustomizationDataFromServer(
  styles: Options,
  frameOptions: any
): IQRCustomizationData {
  return {
    frame: {
      id: frameOptions?.id === "none" ? "frame-none" : (frameOptions?.id || "frame-none"),
      color: frameOptions?.color || "#000000",
      textColor: frameOptions?.textColor || "#ffffff",
      text: frameOptions?.text || "Scan Me"
    },
    style: {
      dotsStyle: mapQRCodeStylingToDotsStyle(styles.dotsOptions?.type) || "dots-square",
      foregroundColor: styles.dotsOptions?.color || "#000000",
      backgroundColor: styles.backgroundOptions?.color || "#ffffff"
    },
    shape: {
      cornerSquareStyle: mapQRCodeStylingToCornerSquareStyle(styles.cornersSquareOptions?.type) || "corner-square-square",
      cornerDotStyle: mapQRCodeStylingToCornerDotStyle(styles.cornersDotOptions?.type) || "corner-dot-square"
    },
    logo: {
      type: styles.image ? (styles.image.includes("/logos/") ? "suggested" : "uploaded") : "none",
      id: styles.image ? extractLogoIdFromUrl(styles.image) : undefined
    }
  };
}

// Style mapping functions
function mapDotsStyleToQRCodeStyling(dotsStyle: string): any {
  const styleMap: Record<string, any> = {
    "dots-square": "square",
    "dots-rounded": "rounded",
    "dots-dots": "dots",
    "dots-classy": "classy",
    "dots-classy-rounded": "classy-rounded",
    "dots-extra-rounded": "extra-rounded"
  };
  return styleMap[dotsStyle] || "square";
}

function mapCornerSquareStyleToQRCodeStyling(cornerStyle: string): any {
  const styleMap: Record<string, any> = {
    "corner-square-square": "square",
    "corner-square-extra-rounded": "extra-rounded",
    "corner-square-dot": "dot"
  };
  return styleMap[cornerStyle] || "square";
}

function mapCornerDotStyleToQRCodeStyling(cornerDotStyle: string): any {
  const styleMap: Record<string, any> = {
    "corner-dot-square": "square",
    "corner-dot-dot": "dot"
  };
  return styleMap[cornerDotStyle] || "square";
}

function mapQRCodeStylingToDotsStyle(type: any): string {
  const typeMap: Record<string, string> = {
    "square": "dots-square",
    "rounded": "dots-rounded",
    "dots": "dots-dots",
    "classy": "dots-classy",
    "classy-rounded": "dots-classy-rounded",
    "extra-rounded": "dots-extra-rounded"
  };
  return typeMap[type] || "dots-square";
}

function mapQRCodeStylingToCornerSquareStyle(type: any): string {
  const typeMap: Record<string, string> = {
    "square": "corner-square-square",
    "extra-rounded": "corner-square-extra-rounded",
    "dot": "corner-square-dot"
  };
  return typeMap[type] || "corner-square-square";
}

function mapQRCodeStylingToCornerDotStyle(type: any): string {
  const typeMap: Record<string, string> = {
    "square": "corner-dot-square",
    "dot": "corner-dot-dot"
  };
  return typeMap[type] || "corner-dot-square";
}

function extractLogoIdFromUrl(url: string): string | undefined {
  const match = url.match(/\/logos\/([^.]+)\.png$/);
  return match?.[1];
}


/**
 *  Main converter
 *  New QR Builder collected data-> Server QR body
 */
export async function convertNewQRBuilderDataToServer(
  builderData: TNewQRBuilderData,
  options: {
    domain: string;
  }
): Promise<NewQrProps> {
  const { qrType, formData, customizationData, title, fileId } = builderData;
  const { domain } = options;

  // Convert form data to QR data string
  const data = convertFormDataToQRData(qrType, formData);

  // Build QR styling options with data included (matching old builder format)
  const styles = buildQRStylingOptions(customizationData, data);

  // Build frame options (matching old builder format)
  const frameOptions = buildFrameOptions(customizationData.frame);

  // Return in exact same format as old builder
  return {
    data,
    qrType,
    title: title || generateDefaultTitle(qrType),
    styles,
    frameOptions,
    fileId,
    link: {
      url: data,
      domain,
      tagId: null,
      webhookIds: []
    }
  };
}

export function convertServerQRToNewBuilder(serverData: TQrServerData): TNewQRBuilderData {
  // Step 1: Extract and convert form data from server QR data
  const formDataFromServer = extractFormDataFromServer(
    serverData.qrType,
    serverData.data,
    serverData.link?.url
  );

  // Step 2: Extract and convert customization data from server styles and frame
  const customizationDataFromServer = extractCustomizationDataFromServer(
    serverData.styles,
    serverData.frameOptions
  );

  // Step 3: Build complete builder data object
  const builderData: TNewQRBuilderData = {
    qrType: serverData.qrType,
    formData: formDataFromServer,
    customizationData: customizationDataFromServer,
    title: serverData.title,
    fileId: serverData.fileId
  };

  return builderData;
}



/**
 * Helper function to get QR data from form based on type
 */
export function getQRDataFromForm(qrType: EQRType, formData: TQRFormData): string {
  return convertFormDataToQRData(qrType, formData);
}


export function convertStorageFormatToNewBuilder(storageData: TQRBuilderDataForStorage): TNewQRBuilderData {
  // Extract the QR data from the styles object
  const qrData = storageData.styles?.data as string || "";

  // Convert server data to form data using the actual QR data
  const formData = extractFormDataFromServer(storageData.qrType, qrData, qrData);

  // Convert styling back to customization data
  const customizationData = extractCustomizationDataFromServer(storageData.styles, storageData.frameOptions);

  return {
    qrType: storageData.qrType,
    formData,
    customizationData,
    title: storageData.title,
    fileId: storageData.fileId
  };
}

/**
 * Converts new QR builder data to storage format for localStorage/Redis
 */
export function convertNewBuilderToStorageFormat(builderData: TNewQRBuilderData): TQRBuilderDataForStorage {
  const { qrType, formData, customizationData, title, fileId } = builderData;

  const qrData = convertFormDataToQRData(qrType, formData);
  const styles = buildQRStylingOptions(customizationData, qrData);
  const frameOptions = buildFrameOptions(customizationData.frame);

  return {
    title: title || generateDefaultTitle(qrType),
    styles,
    frameOptions,
    qrType,
    fileId
  };
}