import { NewQrProps } from "@/lib/types";
import { Options } from "qr-code-styling";
import { FRAMES } from "../constants/customization/frames";
import { EQRType } from "../constants/get-qr-config";
import { TQRFormData } from "../types/context";
import { IFrameData, IQRCustomizationData } from "../types/customization";
import { encodeQRData, parseQRData } from "./qr-data-handlers";
import {
  getCornerDotType,
  getCornerSquareType,
  getDotsType,
  getSuggestedLogoSrc,
} from "./qr-style-mappers";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * New builder internal data format - used throughout the builder
 */
export type TNewQRBuilderData = {
  qrType: EQRType;
  formData: TQRFormData;
  customizationData: IQRCustomizationData;
  title?: string;
  fileId?: string;
};

/**
 * Storage format for localStorage/Redis - compatible with old builder
 */
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

/**
 * Server response format - QR data from API
 */
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
};

// ============================================================================
// HELPER FUNCTIONS - QR STYLING OPTIONS
// ============================================================================

function buildQRStylingOptions(
  customizationData: IQRCustomizationData,
  qrData: string,
): Options {
  const { style, shape, logo } = customizationData;

  const options: Options = {
    data: qrData,
    width: 300,
    height: 300,
    type: "svg",
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 10,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: style.foregroundColor || "#000000",
      type: getDotsType(style.dotsStyle),
    },
    backgroundOptions: {
      color: style.backgroundColor || "#ffffff",
    },
    cornersSquareOptions: {
      color: style.foregroundColor || "#000000",
      type: getCornerSquareType(shape.cornerSquareStyle),
    },
    cornersDotOptions: {
      color: style.foregroundColor || "#000000",
      type: getCornerDotType(shape.cornerDotStyle),
    },
  };

  if (logo.type === "uploaded") {
    if (logo.fileId) {
      // Use full URL for uploaded file (same pattern as QR content files)
      const storageBaseUrl =
        process.env.NEXT_PUBLIC_STORAGE_BASE_URL ||
        "https://dev-assets.getqr.com";
      options.image = `${storageBaseUrl}/qrs-content/${logo.fileId}`;
    }
  } else if (logo.type === "suggested" && logo.id && logo.id !== "logo-none") {
    // For suggested logos, always use iconSrc if available
    // If not available (old QRs), lookup from SUGGESTED_LOGOS
    if (logo.iconSrc) {
      options.image = logo.iconSrc;
    } else if (logo.id) {
      // Fallback: Get iconSrc from logo ID
      const logoSrc = getSuggestedLogoSrc(logo.id);
      options.image = logoSrc || logo.id;
    }
  }

  return options;
}

/**
 * Converts frame data to frame options object
 */
function buildFrameOptions(frameData: IFrameData) {
  // Find the frame by ID and get its TYPE for storage
  const frame = FRAMES.find((f) => f.id === frameData.id);
  const frameType = frame?.type || "none";

  const result = {
    id: frameType,
    color: frameData.color || "#000000",
    textColor: frameData.textColor || "#ffffff",
    text: frameData.text || "Scan Me",
  };

  return result;
}

// ============================================================================
// HELPER FUNCTIONS - EXTRACT/PARSE DATA
// ============================================================================

function extractLogoData(styles: Options): {
  type: "none" | "suggested" | "uploaded";
  id?: string;
  iconSrc?: string;
  fileId?: string;
} {
  if (!styles.image) {
    return { type: "none" };
  }

  const imageStr = typeof styles.image === "string" ? styles.image : "";

  if (imageStr.includes("/files/") || imageStr.includes("/qrs-content/")) {
    const match = imageStr.match(/\/(files|qrs-content)\/([^/]+)$/);
    return {
      type: "uploaded",
      fileId: match?.[2],
    };
  }

  // Check if it's a suggested logo (path to /logos/ - legacy format)
  if (imageStr.includes("/logos/")) {
    const match = imageStr.match(/\/logos\/([^.]+)\.png$/);
    const logoId = match?.[1];
    // Lookup the actual iconSrc for old QRs
    const iconSrc = logoId ? getSuggestedLogoSrc(logoId) : undefined;
    return {
      type: "suggested",
      id: logoId,
      iconSrc: iconSrc,
    };
  }

  // Check if it's a Next.js static import path (/_next/static/...)
  if (imageStr.startsWith("/_next/")) {
    const logoIdMatch = imageStr.match(/logo-([^/.]+)/);
    return {
      type: "suggested",
      id: logoIdMatch ? `logo-${logoIdMatch[1]}` : undefined,
      iconSrc: imageStr,
    };
  }

  // Check if it's just a logo ID (starts with "logo-")
  if (imageStr.startsWith("logo-")) {
    return {
      type: "suggested",
      id: imageStr,
    };
  }

  // Otherwise it's an uploaded logo (legacy or blob URL)
  return { type: "uploaded" };
}

/**
 * Get style ID from QRCodeStyling type
 */
function getDotsStyleId(type: any): string {
  const typeMap: Record<string, string> = {
    square: "dots-square",
    dots: "dots-dots",
    rounded: "dots-rounded",
    classy: "dots-classy",
    "classy-rounded": "dots-classy-rounded",
    "extra-rounded": "dots-extra-rounded",
  };
  return typeMap[type] || "dots-square";
}

function getCornerSquareStyleId(type: any): string {
  const typeMap: Record<string, string> = {
    square: "corner-square-square",
    rounded: "corner-square-rounded",
    dot: "corner-square-dot",
    "classy-rounded": "corner-square-classy-rounded",
  };
  return typeMap[type] || "corner-square-square";
}

function getCornerDotStyleId(type: any): string {
  const typeMap: Record<string, string> = {
    square: "corner-dot-square",
    dot: "corner-dot-dot",
    dots: "corner-dot-dots",
    rounded: "corner-dot-rounded",
    classy: "corner-dot-classy",
  };
  return typeMap[type] || "corner-dot-square";
}

/**
 * Extract customization data from server styles and frame options
 * IMPORTANT: Storage has frame TYPE (e.g., "card"), but we need ID (e.g., "frame-card")
 */
function extractCustomizationData(
  styles: Options,
  frameOptions: any,
): IQRCustomizationData {
  // Convert frame TYPE to ID by finding the frame in FRAMES array
  const frameType = frameOptions?.id || "none";
  const frame = FRAMES.find((f) => f.type === frameType);
  const frameId = frame?.id || "frame-none";

  return {
    frame: {
      id: frameId, // Convert TYPE to ID (e.g., "card" -> "frame-card")
      color: frameOptions?.color,
      textColor: frameOptions?.textColor,
      text: frameOptions?.text,
    },
    style: {
      dotsStyle: getDotsStyleId(styles.dotsOptions?.type),
      foregroundColor: styles.dotsOptions?.color || "#000000",
      backgroundColor: styles.backgroundOptions?.color || "#ffffff",
    },
    shape: {
      cornerSquareStyle: getCornerSquareStyleId(
        styles.cornersSquareOptions?.type,
      ),
      cornerDotStyle: getCornerDotStyleId(styles.cornersDotOptions?.type),
    },
    logo: extractLogoData(styles),
  };
}

// ============================================================================
// MAIN CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert new QR builder data to server API format
 */
export async function convertNewQRBuilderDataToServer(
  builderData: TNewQRBuilderData,
  options: { domain: string },
): Promise<NewQrProps> {
  const { qrType, formData, customizationData, title, fileId } = builderData;
  const { domain } = options;

  const data = encodeQRData(qrType, formData, fileId);

  const styles = buildQRStylingOptions(customizationData, data);

  const frameOptions = buildFrameOptions(customizationData.frame);

  const qrTitle =
    title || `${qrType.charAt(0).toUpperCase() + qrType.slice(1)} QR Code`;

  // Use the encoded data directly
  const linkUrl = data;

  const result = {
    data,
    qrType,
    title: qrTitle,
    styles,
    frameOptions,
    fileId,
    link: {
      url: linkUrl,
      domain,
      tagId: null,
      webhookIds: [],
    },
  };

  return result;
}

/**
 * Convert server QR data back to new builder format
 */
export function convertServerQRToNewBuilder(
  serverData: TQrServerData,
): TNewQRBuilderData {
  // Parse QR data to form data using qr-data-handlers
  const sourceData = serverData.link?.url || serverData.data;
  const formData = parseQRData(serverData.qrType, sourceData) as TQRFormData;

  // Extract customization data from styles and frame options
  const customizationData = extractCustomizationData(
    serverData.styles,
    serverData.frameOptions,
  );

  return {
    qrType: serverData.qrType,
    formData,
    customizationData,
    title: serverData.title,
    fileId: serverData.fileId,
  };
}

/**
 * Convert new builder data to storage format (for localStorage/Redis)
 */
export function convertNewBuilderToStorageFormat(
  builderData: TNewQRBuilderData,
): TQRBuilderDataForStorage {
  const { qrType, formData, customizationData, title, fileId } = builderData;

  // Encode form data to QR data string
  const qrData = encodeQRData(qrType, formData, fileId);

  // Build QR styling options
  const styles = buildQRStylingOptions(customizationData, qrData);

  // Build frame options
  const frameOptions = buildFrameOptions(customizationData.frame);

  const result = {
    title:
      title || `${qrType.charAt(0).toUpperCase() + qrType.slice(1)} QR Code`,
    styles,
    frameOptions,
    qrType,
    fileId, // For PDF/Image/Video content files only
  };

  return result;
}
